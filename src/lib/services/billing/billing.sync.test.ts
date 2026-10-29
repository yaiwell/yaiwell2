/**
 * Tests de `syncSubscription`: mapa estado → plan, límites siempre
 * aplicados, reproceso idempotente, bajada programada y periodo desde
 * los items (API dahlia). La concurrencia va en
 * `billing.sync.concurrency.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  subscriptions: { retrieve: vi.fn(), list: vi.fn(), cancel: vi.fn() },
  prices: { retrieve: vi.fn() },
}));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));
vi.mock('@/lib/integrations/sentry', () => ({ isSentryEnabled: () => false }));

const txMock = vi.hoisted(() => ({ marker: 'tx' }));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(txMock)) },
}));

const repoMock = vi.hoisted(() => ({
  findByCustomerId: vi.fn(),
  findPlanByTier: vi.fn(),
  findPlanById: vi.fn(),
  lockProviderPlan: vi.fn(),
  lockBillingRow: vi.fn(),
  writeMirror: vi.fn(),
  setProviderPlan: vi.fn(),
}));
vi.mock('./billing.repository', () => ({ billingRepository: repoMock }));

const applyPlanLimitsMock = vi.hoisted(() => vi.fn());
vi.mock('./billing.plan-limits', () => ({ applyPlanLimits: applyPlanLimitsMock }));

import { BillingProviderNotFoundError } from './billing.errors';
import { syncSubscription } from './billing.sync';
import {
  buildBillingRow,
  buildPrice,
  buildSchedule,
  buildSubscription,
  planBy,
  PROVIDER_ID,
} from './billing.test-fixtures';

/** Simula las suscripciones del Customer en Stripe. */
function stripeHas(...subs: ReturnType<typeof buildSubscription>[]) {
  stripeMock.subscriptions.retrieve.mockImplementation(async (id: string) => {
    const sub = subs.find((candidate) => candidate.id === id);
    if (!sub) throw Object.assign(new Error('missing'), { code: 'resource_missing' });
    return sub;
  });
  stripeMock.subscriptions.list.mockResolvedValue({ data: subs });
}

/** La misma fila para la lectura previa y la releída con el bloqueo. */
function givenRow(overrides: Record<string, unknown> = {}) {
  const row = buildBillingRow(overrides);
  repoMock.findByCustomerId.mockResolvedValue(row);
  repoMock.lockBillingRow.mockResolvedValue(row);
}

/** Último espejo escrito. */
function lastMirror() {
  return repoMock.writeMirror.mock.calls.at(-1)?.[2];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  givenRow();
  repoMock.findPlanByTier.mockImplementation(async (tier: string) => planBy(tier));
  repoMock.findPlanById.mockImplementation(async (id: string) => planBy(id));
  repoMock.lockProviderPlan.mockResolvedValue('plan-free');
});

describe('syncSubscription — estado → plan', () => {
  it.each(['active', 'past_due'] as const)('%s → plan del price', async (status) => {
    stripeHas(buildSubscription({ status, tier: 'pro' }));
    const result = await syncSubscription('sub_1');
    expect(repoMock.setProviderPlan).toHaveBeenCalledWith(txMock, PROVIDER_ID, 'plan-pro');
    expect(applyPlanLimitsMock).toHaveBeenCalledWith(txMock, PROVIDER_ID, 50, expect.any(Date));
    expect(result).toEqual({
      changed: true,
      providerId: PROVIDER_ID,
      planChanged: { from: 'free', to: 'pro' },
    });
  });

  it.each(['canceled', 'incomplete_expired', 'unpaid', 'paused'] as const)(
    '%s → Gratis y aplica el límite de 1 servicio',
    async (status) => {
      repoMock.lockProviderPlan.mockResolvedValue('plan-pro');
      givenRow({ stripeSubscriptionId: 'sub_1', subscriptionStatus: 'past_due' });
      stripeHas(buildSubscription({ status, tier: 'pro' }));
      const result = await syncSubscription('sub_1');
      expect(repoMock.setProviderPlan).toHaveBeenCalledWith(txMock, PROVIDER_ID, 'plan-free');
      expect(applyPlanLimitsMock).toHaveBeenCalledWith(txMock, PROVIDER_ID, 1, expect.any(Date));
      expect(result.planChanged).toEqual({ from: 'pro', to: 'free' });
      expect(lastMirror()).toMatchObject({ subscriptionStatus: status, subscribedPlanId: null });
    },
  );

  it.each(['incomplete', 'trialing'] as const)('%s → espejo sí, plan no', async (status) => {
    stripeHas(buildSubscription({ status, tier: 'pro' }));
    const result = await syncSubscription('sub_1');
    expect(repoMock.setProviderPlan).not.toHaveBeenCalled();
    expect(applyPlanLimitsMock).not.toHaveBeenCalled();
    expect(lastMirror()).toMatchObject({ subscriptionStatus: status });
    expect(result.planChanged).toBeUndefined();
  });

  it('un price fuera del catálogo no cambia el plan', async () => {
    const sub = buildSubscription({ tier: 'pro' });
    sub.items.data[0]!.price = buildPrice('x', 100, { lookup_key: 'foreign', metadata: {} });
    stripeHas(sub);
    await syncSubscription('sub_1');
    expect(repoMock.setProviderPlan).not.toHaveBeenCalled();
  });

  it('Customer sin negocio → BillingProviderNotFoundError', async () => {
    repoMock.findByCustomerId.mockResolvedValue(null);
    stripeHas(buildSubscription());
    await expect(syncSubscription('sub_1')).rejects.toBeInstanceOf(BillingProviderNotFoundError);
  });
});

describe('syncSubscription — idempotencia', () => {
  it('reprocesar el mismo estado no cambia el plan pero re-aplica los límites', async () => {
    const periodEnd = 1_800_000_000;
    repoMock.lockProviderPlan.mockResolvedValue('plan-pro');
    givenRow({
      stripeSubscriptionId: 'sub_1',
      subscriptionStatus: 'active',
      subscribedPlanId: 'plan-pro',
      currentPeriodEnd: new Date(periodEnd * 1000),
    });
    stripeHas(buildSubscription({ tier: 'pro', periodEnd }));
    const result = await syncSubscription('sub_1');
    expect(result).toEqual({ changed: false, providerId: PROVIDER_ID });
    expect(repoMock.setProviderPlan).not.toHaveBeenCalled();
    // Repara servicios publicados de más aunque el plan no cambie.
    expect(applyPlanLimitsMock).toHaveBeenCalledWith(txMock, PROVIDER_ID, 50, expect.any(Date));
  });

  it('lee siempre la suscripción actual con price y schedule expandidos', async () => {
    stripeHas(buildSubscription());
    await syncSubscription('sub_1');
    expect(stripeMock.subscriptions.retrieve).toHaveBeenCalledWith('sub_1', {
      expand: ['items.data.price', 'schedule'],
    });
  });

  it('bloquea primero el negocio y luego su fila de facturación', async () => {
    stripeHas(buildSubscription());
    await syncSubscription('sub_1');
    const providerLock = repoMock.lockProviderPlan.mock.invocationCallOrder[0]!;
    const billingLock = repoMock.lockBillingRow.mock.invocationCallOrder[0]!;
    expect(providerLock).toBeLessThan(billingLock);
  });

  it('toma el fin de periodo del item (dahlia)', async () => {
    stripeHas(buildSubscription({ periodEnd: 1_801_234_567 }));
    await syncSubscription('sub_1');
    expect(lastMirror()?.currentPeriodEnd).toEqual(new Date(1_801_234_567 * 1000));
  });

  it('marca cancelAtPeriodEnd con cancel_at_period_end o con cancel_at', async () => {
    stripeHas(buildSubscription({ cancelAt: 1_800_000_000 }));
    await syncSubscription('sub_1');
    expect(lastMirror()?.cancelAtPeriodEnd).toBe(true);
  });
});

describe('syncSubscription — bajada programada', () => {
  it('guarda el plan y la fecha de la fase siguiente del schedule', async () => {
    stripeMock.prices.retrieve.mockResolvedValue(buildPrice('basic', 1900));
    stripeHas(buildSubscription({ tier: 'pro', schedule: buildSchedule('price_basic') }));
    await syncSubscription('sub_1');
    expect(stripeMock.prices.retrieve).toHaveBeenCalledWith('price_basic');
    expect(lastMirror()).toMatchObject({
      scheduledPlanId: 'plan-basic',
      scheduledChangeAt: new Date(1_800_000_000 * 1000),
    });
  });

  it('una fase siguiente con el mismo tier no es un cambio', async () => {
    stripeHas(buildSubscription({ tier: 'pro', schedule: buildSchedule(buildPrice('pro', 4900)) }));
    await syncSubscription('sub_1');
    expect(lastMirror()).toMatchObject({ scheduledPlanId: null, scheduledChangeAt: null });
  });
});
