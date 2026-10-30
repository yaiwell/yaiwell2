/**
 * Tests del tope de reservas futuras en el local por cliente (CLAUDE.md
 * §4.bis, antiabuso 2026-10-30): consulta de la UI, rechazo al crear y
 * relectura con bloqueo por cliente dentro de la transacción.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  availabilityRepo: {
    findServiceForAvailability: vi.fn(),
    findFirstProfessionalIdForProvider: vi.fn(),
  },
  createBooking: vi.fn(),
  eligibility: vi.fn(),
  findStatus: vi.fn(),
  countActive: vi.fn(),
  lockClient: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/services/availability', () => ({ availabilityRepository: mocks.availabilityRepo }));
vi.mock('@/lib/services/booking', async () => {
  const errors = await import('@/lib/services/booking/booking.errors');
  return { ...errors, createBooking: mocks.createBooking };
});
vi.mock('@/lib/services/sanctions', () => ({ getClientOnsiteEligibility: mocks.eligibility }));
vi.mock('./checkout.onsite.repository', () => ({
  onsiteRepository: {
    findProviderOnsiteStatus: mocks.findStatus,
    countActiveOnsiteBookings: mocks.countActive,
    lockClientOnsite: mocks.lockClient,
  },
}));

import { OnsitePaymentNotAllowedError } from './checkout.errors';
import { createOnsiteBooking, getPaymentOptions } from './checkout.onsite.service';

const SERVICE_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const NOW = new Date('2026-11-02T10:00:00.000Z');
const isoIn = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();
const input = { serviceId: SERVICE_ID, slotStartIso: isoIn(180) };

type Precondition = (tx: unknown) => Promise<void>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.availabilityRepo.findServiceForAvailability.mockResolvedValue({
    id: SERVICE_ID,
    providerId: 'prov-1',
    professionalId: 'pro-1',
    durationMinutes: 60,
  });
  mocks.findStatus.mockResolvedValue({
    acceptsOnsitePayment: true,
    billing: { onsitePaymentMethodReadyAt: NOW, commissionDebtSince: null },
  });
  mocks.eligibility.mockResolvedValue({ allowed: true, restrictedUntil: null });
  mocks.countActive.mockResolvedValue(0);
  mocks.lockClient.mockResolvedValue(undefined);
  mocks.createBooking.mockResolvedValue({
    id: 'booking-1',
    priceCents: 4500,
    startAt: NOW,
    endAt: NOW,
  });
});

describe('getPaymentOptions · tope de reservas en el local', () => {
  it('con 2 reservas activas sigue disponible', async () => {
    mocks.countActive.mockResolvedValue(2);
    await expect(getPaymentOptions(input, 'client-1', NOW)).resolves.toMatchObject({
      onsite: 'available',
    });
    expect(mocks.countActive).toHaveBeenCalledWith('client-1', NOW);
  });

  it('con 3 → limit_reached', async () => {
    mocks.countActive.mockResolvedValue(3);
    await expect(getPaymentOptions(input, 'client-1', NOW)).resolves.toEqual({
      online: 'available',
      onsite: 'limit_reached',
      restrictedUntilIso: null,
    });
  });

  it('sin sesión o negocio que no lo ofrece: no cuenta nada', async () => {
    await getPaymentOptions(input, null, NOW);
    mocks.findStatus.mockResolvedValue({ acceptsOnsitePayment: false, billing: null });
    await getPaymentOptions(input, 'client-1', NOW);
    expect(mocks.countActive).not.toHaveBeenCalled();
  });
});

describe('createOnsiteBooking · tope de reservas en el local', () => {
  it('con 3 → limit_reached, sin soltar la pending ni crear', async () => {
    mocks.countActive.mockResolvedValue(3);
    const releasePending = vi.fn(async () => {});
    const err = await createOnsiteBooking(input, 'client-1', NOW, { releasePending }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(OnsitePaymentNotAllowedError);
    expect((err as OnsitePaymentNotAllowedError).reason).toBe('limit_reached');
    expect(releasePending).not.toHaveBeenCalled();
    expect(mocks.createBooking).not.toHaveBeenCalled();
  });

  it('con 2 se crea', async () => {
    mocks.countActive.mockResolvedValue(2);
    await expect(createOnsiteBooking(input, 'client-1', NOW)).resolves.toMatchObject({
      bookingId: 'booking-1',
    });
  });

  it('carrera: dentro de la transacción bloquea al cliente, recuenta y rechaza con 3', async () => {
    let precondition: Precondition | undefined;
    mocks.createBooking.mockImplementation(
      async (_i: unknown, _c: unknown, opts: { precondition: Precondition }) => {
        precondition = opts.precondition;
        return { id: 'b', priceCents: 1, startAt: NOW, endAt: NOW };
      },
    );
    mocks.countActive.mockResolvedValue(2);
    await createOnsiteBooking(input, 'client-1', NOW);

    // Otra petición simultánea creó la tercera entre la comprobación y aquí.
    const tx = { marker: 'tx' };
    mocks.countActive.mockResolvedValue(3);
    await expect(precondition?.(tx)).rejects.toMatchObject({ reason: 'limit_reached' });
    expect(mocks.lockClient).toHaveBeenLastCalledWith(tx, 'client-1');
    expect(mocks.countActive).toHaveBeenLastCalledWith('client-1', NOW, tx);
    // El bloqueo va antes del recuento: si no, dos peticiones verían 2.
    expect(mocks.lockClient.mock.invocationCallOrder.at(-1)).toBeLessThan(
      mocks.countActive.mock.invocationCallOrder.at(-1) ?? 0,
    );

    mocks.countActive.mockResolvedValue(2);
    await expect(precondition?.(tx)).resolves.toBeUndefined();
  });

  it('en la transacción, el negocio se comprueba antes que el tope', async () => {
    let precondition: Precondition | undefined;
    mocks.createBooking.mockImplementation(
      async (_i: unknown, _c: unknown, opts: { precondition: Precondition }) => {
        precondition = opts.precondition;
        return { id: 'b', priceCents: 1, startAt: NOW, endAt: NOW };
      },
    );
    await createOnsiteBooking(input, 'client-1', NOW);
    mocks.findStatus.mockResolvedValue({ acceptsOnsitePayment: false, billing: null });
    mocks.countActive.mockClear();
    await expect(precondition?.({})).rejects.toMatchObject({ reason: 'provider' });
    expect(mocks.countActive).not.toHaveBeenCalled();
  });
});
