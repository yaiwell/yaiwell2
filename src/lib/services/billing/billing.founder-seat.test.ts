/**
 * Asignación de plazas al aprobar y cierre del regalo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applyPlanLimits: vi.fn(),
  lockProviderPlan: vi.fn(),
  setProviderPlan: vi.fn(),
  prisma: {
    founderSeat: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('./billing.checkout-sessions', () => ({ expireOpenPlanCheckouts: vi.fn() }));
vi.mock('./billing.plan-limits', () => ({ applyPlanLimits: mocks.applyPlanLimits }));
vi.mock('./billing.repository', () => ({
  billingRepository: {
    lockProviderPlan: mocks.lockProviderPlan,
    setProviderPlan: mocks.setProviderPlan,
  },
}));

import { grantFounderSeat } from './billing.founder-seat';
import { FOUNDER_SEATS_TOTAL } from './billing.founder-seat.rules';
import { runFounderSeatSweep } from './billing.founder-seat.sweep';

const NOW = new Date('2026-11-06T10:00:00Z');
const PALMA = { lat: 39.5696, lng: 2.6502 };

function makeTx(
  overrides: {
    point?: { lat: number; lng: number };
    status?: string | null;
    service?: boolean;
    schedule?: unknown;
    used?: number;
    evaluated?: boolean;
  } = {},
) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([overrides.point ?? PALMA]),
    $executeRaw: vi.fn().mockResolvedValue(1),
    founderSeat: {
      count: vi.fn().mockResolvedValue(overrides.used ?? 0),
      create: vi.fn().mockResolvedValue({}),
    },
    providerBilling: {
      findUnique: vi.fn().mockResolvedValue({ subscriptionStatus: overrides.status ?? null }),
    },
    service: {
      findFirst: vi.fn().mockResolvedValue(overrides.service === false ? null : { id: 'svc' }),
    },
    professional: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { schedule: overrides.schedule ?? { monday: [{ open: '09:00', close: '14:00' }] } },
        ]),
    },
    plan: { findUnique: vi.fn().mockResolvedValue({ id: 'premium', maxServices: 9999 }) },
    provider: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ founderEvaluatedAt: overrides.evaluated ? NOW : null }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

// El tipo real de la transacción es enorme; aquí solo importa lo que se usa.
const grant = (tx: ReturnType<typeof makeTx>) => grantFounderSeat(tx as never, 'prov-1', NOW);

beforeEach(() => vi.clearAllMocks());

describe('grantFounderSeat', () => {
  it('da la plaza siguiente y pasa a Premium', async () => {
    const tx = makeTx({ used: 7 });

    await grant(tx);

    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.founderSeat.create).toHaveBeenCalledWith({
      data: {
        providerId: 'prov-1',
        seatNumber: 8,
        startsAt: NOW,
        endsAt: new Date('2027-11-06T10:00:00Z'),
      },
    });
    expect(tx.provider.update).toHaveBeenCalledWith({
      where: { id: 'prov-1' },
      data: { planId: 'premium' },
    });
    expect(mocks.applyPlanLimits).toHaveBeenCalledWith(tx, 'prov-1', 9999, NOW);
  });

  it.each([
    ['ya se evaluó al aprobarlo antes (rechazar y reaprobar)', { evaluated: true }],
    ['fuera de Mallorca', { point: { lat: 41.38, lng: 2.17 } }],
    ['sin servicio', { service: false }],
    ['sin horario', { schedule: { monday: [] } }],
    ['con suscripción viva', { status: 'active' }],
    ['con el cobro fallando', { status: 'past_due' }],
    ['sin plazas', { used: FOUNDER_SEATS_TOTAL }],
  ])('no da plaza: %s', async (_name, overrides) => {
    const tx = makeTx(overrides);

    await grant(tx);

    expect(tx.founderSeat.create).not.toHaveBeenCalled();
    expect(tx.provider.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { planId: 'premium' } }),
    );
  });

  it('sin plaza también queda evaluado: no hay segunda oportunidad', async () => {
    const tx = makeTx({ service: false });

    await grant(tx);

    expect(tx.provider.update).toHaveBeenCalledWith({
      where: { id: 'prov-1' },
      data: { founderEvaluatedAt: NOW },
    });
  });

  it('una suscripción ya muerta no impide la plaza', async () => {
    const tx = makeTx({ status: 'canceled' });

    await grant(tx);

    expect(tx.founderSeat.create).toHaveBeenCalled();
  });
});

describe('runFounderSeatSweep', () => {
  const notify = vi.fn();
  const seat = (endsAt: string, extra = {}) => ({
    id: 'seat-1',
    providerId: 'prov-1',
    endsAt: new Date(endsAt),
    endedAt: null,
    notified60At: null,
    notified15At: null,
    ...extra,
  });
  const run = () => runFounderSeatSweep({ now: NOW, deadline: Date.now() + 60_000, notify });

  function closeTx(billing: object | null) {
    const tx = {
      providerBilling: { findUnique: vi.fn().mockResolvedValue(billing) },
      plan: {
        findUnique: vi.fn(({ where }: { where: { tier?: string; id?: string } }) =>
          Promise.resolve(
            where.tier === 'free'
              ? { id: 'free', maxServices: 1 }
              : { id: where.id, maxServices: 10 },
          ),
        ),
      },
      founderSeat: { update: vi.fn().mockResolvedValue({}) },
    };
    mocks.prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx));
    mocks.lockProviderPlan.mockResolvedValue('premium');
    return tx;
  }

  beforeEach(() => {
    notify.mockResolvedValue(true);
    mocks.prisma.$transaction.mockReset();
  });

  it('al vencer pasa a Gratis, oculta lo que sobra y avisa', async () => {
    mocks.prisma.founderSeat.findMany.mockResolvedValue([seat('2026-11-06T09:00:00Z')]);
    const tx = closeTx(null);

    const summary = await run();

    expect(mocks.setProviderPlan).toHaveBeenCalledWith(tx, 'prov-1', 'free');
    expect(mocks.applyPlanLimits).toHaveBeenCalledWith(tx, 'prov-1', 1, NOW);
    expect(tx.founderSeat.update).toHaveBeenCalledWith({
      where: { id: 'seat-1' },
      data: { endedAt: NOW },
    });
    expect(notify).toHaveBeenCalledWith('ended', 'prov-1', expect.any(Date));
    expect(mocks.prisma.founderSeat.update).toHaveBeenCalledWith({
      where: { id: 'seat-1' },
      data: { notifiedEndedAt: NOW },
    });
    expect(summary.ended).toBe(1);
  });

  it('si ya contrató un plan se queda en él y no avisa', async () => {
    mocks.prisma.founderSeat.findMany.mockResolvedValue([seat('2026-11-06T09:00:00Z')]);
    const tx = closeTx({ subscriptionStatus: 'active', subscribedPlanId: 'basic' });

    await run();

    expect(mocks.setProviderPlan).toHaveBeenCalledWith(tx, 'prov-1', 'basic');
    expect(tx.founderSeat.update).toHaveBeenCalledWith({
      where: { id: 'seat-1' },
      data: { endedAt: NOW, notifiedEndedAt: NOW },
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it('envía el aviso que toca y lo marca', async () => {
    mocks.prisma.founderSeat.findMany.mockResolvedValue([seat('2026-12-20T10:00:00Z')]);

    const summary = await run();

    expect(notify).toHaveBeenCalledWith('first', 'prov-1', expect.any(Date));
    expect(mocks.prisma.founderSeat.update).toHaveBeenCalledWith({
      where: { id: 'seat-1' },
      data: { notified60At: NOW },
    });
    expect(summary.notified).toBe(1);
  });

  it('un aviso que no sale no se marca: se reintenta mañana', async () => {
    notify.mockResolvedValue(false);
    mocks.prisma.founderSeat.findMany.mockResolvedValue([seat('2026-12-20T10:00:00Z')]);

    const summary = await run();

    expect(mocks.prisma.founderSeat.update).not.toHaveBeenCalled();
    expect(summary).toEqual({ ended: 0, notified: 0, failed: 1 });
  });

  it('reintenta el aviso de fin de una plaza ya cerrada sin volver a cerrarla', async () => {
    mocks.prisma.founderSeat.findMany.mockResolvedValue([
      seat('2026-11-01T09:00:00Z', { endedAt: new Date('2026-11-02T03:00:00Z') }),
    ]);

    await run();

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith('ended', 'prov-1', expect.any(Date));
    expect(mocks.prisma.founderSeat.update).toHaveBeenCalledWith({
      where: { id: 'seat-1' },
      data: { notifiedEndedAt: NOW },
    });
  });

  it('una plaza que falla no para a las demás', async () => {
    mocks.prisma.founderSeat.findMany.mockResolvedValue([
      seat('2026-11-06T09:00:00Z'),
      seat('2026-12-20T10:00:00Z', { id: 'seat-2', providerId: 'prov-2' }),
    ]);
    mocks.prisma.$transaction.mockRejectedValue(new Error('boom'));

    const summary = await run();

    expect(summary).toEqual({ ended: 0, notified: 1, failed: 1 });
  });

  it('sin tiempo no empieza ninguna plaza', async () => {
    mocks.prisma.founderSeat.findMany.mockResolvedValue([seat('2026-11-06T09:00:00Z')]);

    const summary = await runFounderSeatSweep({ now: NOW, deadline: 0, notify });

    expect(summary.ended).toBe(0);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
