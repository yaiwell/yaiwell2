/**
 * Tests de la reserva con pago en el local: orden de comprobaciones,
 * frontera de 2 h (2h00 / 1h59) y reloj compartido con `createBooking`.
 */

import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { availabilityRepoMock, createBookingMock, eligibilityMock, findStatusMock } = vi.hoisted(
  () => ({
    availabilityRepoMock: {
      findServiceForAvailability: vi.fn(),
      findFirstProfessionalIdForProvider: vi.fn(),
    },
    createBookingMock: vi.fn(),
    eligibilityMock: vi.fn(),
    findStatusMock: vi.fn(),
  }),
);

vi.mock('server-only', () => ({}));
vi.mock('@/lib/services/availability', () => ({ availabilityRepository: availabilityRepoMock }));
vi.mock('@/lib/services/booking', async () => {
  const errors = await import('@/lib/services/booking/booking.errors');
  return { ...errors, createBooking: createBookingMock };
});
vi.mock('@/lib/services/sanctions', () => ({ getClientOnsiteEligibility: eligibilityMock }));
vi.mock('./checkout.onsite.repository', () => ({
  onsiteRepository: {
    findProviderOnsiteStatus: findStatusMock,
    // El tope de reservas en el local tiene sus propios tests
    // (`checkout.onsite.limit.test.ts`); aquí el cliente no tiene ninguna.
    countActiveOnsiteBookings: vi.fn(async () => 0),
    lockClientOnsite: vi.fn(async () => {}),
  },
}));

import { OnsiteBookingTooLateError, ServiceNotFoundError } from '@/lib/services/booking';

import { OnsitePaymentNotAllowedError } from './checkout.errors';
import { createOnsiteBooking, getPaymentOptions } from './checkout.onsite.service';

const SERVICE_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const NOW = new Date('2026-11-02T10:00:00.000Z');
const MIN = 60 * 1000;
const isoIn = (m: number) => new Date(NOW.getTime() + m * MIN).toISOString();
const READY = new Date('2026-10-01T00:00:00Z');

const readyProvider = {
  acceptsOnsitePayment: true,
  billing: { onsitePaymentMethodReadyAt: READY, commissionDebtSince: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  availabilityRepoMock.findServiceForAvailability.mockResolvedValue({
    id: SERVICE_ID,
    providerId: 'prov-1',
    professionalId: 'pro-1',
    durationMinutes: 60,
  });
  findStatusMock.mockResolvedValue(readyProvider);
  eligibilityMock.mockResolvedValue({ allowed: true, restrictedUntil: null, sanctionsInWindow: 0 });
  createBookingMock.mockImplementation(async (input: { slotStart: Date }) => ({
    id: 'booking-1',
    priceCents: 4500,
    originalPriceCents: null,
    discountPct: null,
    startAt: input.slotStart,
    endAt: new Date(input.slotStart.getTime() + 60 * MIN),
  }));
});

describe('createOnsiteBooking · pending anterior y relectura en la transacción', () => {
  it('suelta la pending solo tras validar, y antes de crear', async () => {
    const releasePending = vi.fn(async () => {});
    await createOnsiteBooking(
      { serviceId: SERVICE_ID, slotStartIso: isoIn(180) },
      'client-1',
      NOW,
      { releasePending },
    );
    expect(releasePending).toHaveBeenCalledTimes(1);
    expect(releasePending.mock.invocationCallOrder[0]).toBeLessThan(
      createBookingMock.mock.invocationCallOrder[0],
    );
  });

  it('cliente bloqueado → no suelta la pending', async () => {
    eligibilityMock.mockResolvedValue({
      allowed: false,
      restrictedUntil: new Date('2027-01-01T00:00:00Z'),
      sanctionsInWindow: 3,
    });
    const releasePending = vi.fn(async () => {});
    await expect(
      createOnsiteBooking({ serviceId: SERVICE_ID, slotStartIso: isoIn(180) }, 'client-1', NOW, {
        releasePending,
      }),
    ).rejects.toBeInstanceOf(OnsitePaymentNotAllowedError);
    expect(releasePending).not.toHaveBeenCalled();
  });

  it('a 1h59 → no suelta la pending', async () => {
    const releasePending = vi.fn(async () => {});
    await expect(
      createOnsiteBooking({ serviceId: SERVICE_ID, slotStartIso: isoIn(119) }, 'client-1', NOW, {
        releasePending,
      }),
    ).rejects.toBeInstanceOf(OnsitePaymentNotAllowedError);
    expect(releasePending).not.toHaveBeenCalled();
  });

  it('la precondición relee el negocio en la transacción y rechaza si entró en deuda', async () => {
    let precondition: ((tx: unknown) => Promise<void>) | undefined;
    createBookingMock.mockImplementation(
      async (_i, _c, opts: { precondition: typeof precondition }) => {
        precondition = opts.precondition;
        return { id: 'b', priceCents: 1, startAt: NOW, endAt: NOW };
      },
    );
    await createOnsiteBooking({ serviceId: SERVICE_ID, slotStartIso: isoIn(180) }, 'client-1', NOW);

    const tx = { marker: 'tx' };
    findStatusMock.mockResolvedValue({
      acceptsOnsitePayment: true,
      billing: { onsitePaymentMethodReadyAt: READY, commissionDebtSince: NOW },
    });
    await expect(precondition?.(tx)).rejects.toMatchObject({ reason: 'provider' });
    expect(findStatusMock).toHaveBeenLastCalledWith('prov-1', tx);

    findStatusMock.mockResolvedValue(readyProvider);
    await expect(precondition?.(tx)).resolves.toBeUndefined();
  });
});

describe('createOnsiteBooking', () => {
  it('crea la reserva en el local con el mismo reloj y devuelve el importe a pagar', async () => {
    const result = await createOnsiteBooking(
      { serviceId: SERVICE_ID, slotStartIso: isoIn(180), notes: 'hola' },
      'client-1',
      NOW,
    );

    expect(createBookingMock).toHaveBeenCalledWith(
      {
        serviceId: SERVICE_ID,
        professionalId: 'pro-1',
        slotStart: new Date(isoIn(180)),
        notes: 'hola',
      },
      'client-1',
      expect.objectContaining({ paymentMode: 'onsite', now: NOW }),
    );
    expect(result).toEqual({
      bookingId: 'booking-1',
      paymentMode: 'onsite',
      amountCents: 4500,
      originalPriceCents: null,
      discountPct: null,
      slotStartIso: isoIn(180),
      slotEndIso: isoIn(240),
    });
  });

  it('a 2h00 justas se permite', async () => {
    await expect(
      createOnsiteBooking({ serviceId: SERVICE_ID, slotStartIso: isoIn(120) }, 'client-1', NOW),
    ).resolves.toMatchObject({ bookingId: 'booking-1' });
  });

  it('a 1h59 → last_minute, sin crear nada', async () => {
    const err = await createOnsiteBooking(
      { serviceId: SERVICE_ID, slotStartIso: isoIn(119) },
      'client-1',
      NOW,
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OnsitePaymentNotAllowedError);
    expect((err as OnsitePaymentNotAllowedError).reason).toBe('last_minute');
    expect((err as OnsitePaymentNotAllowedError).restrictedUntil).toBeNull();
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it('negocio sin método de pago o con deuda → provider', async () => {
    findStatusMock.mockResolvedValue({
      acceptsOnsitePayment: true,
      billing: { onsitePaymentMethodReadyAt: READY, commissionDebtSince: READY },
    });
    const err = await createOnsiteBooking(
      { serviceId: SERVICE_ID, slotStartIso: isoIn(180) },
      'client-1',
      NOW,
    ).catch((e: unknown) => e);
    expect((err as OnsitePaymentNotAllowedError).reason).toBe('provider');
    expect(eligibilityMock).not.toHaveBeenCalled();
    expect(createBookingMock).not.toHaveBeenCalled();
  });

  it('cliente bloqueado → client_restricted con restrictedUntil', async () => {
    const until = new Date('2027-01-15T10:00:00Z');
    eligibilityMock.mockResolvedValue({
      allowed: false,
      restrictedUntil: until,
      sanctionsInWindow: 3,
    });
    const err = await createOnsiteBooking(
      { serviceId: SERVICE_ID, slotStartIso: isoIn(180) },
      'client-1',
      NOW,
    ).catch((e: unknown) => e);
    expect((err as OnsitePaymentNotAllowedError).reason).toBe('client_restricted');
    expect((err as OnsitePaymentNotAllowedError).restrictedUntil).toEqual(until);
    expect(eligibilityMock).toHaveBeenCalledWith('client-1', NOW);
  });

  it('la red de seguridad del dominio (OnsiteBookingTooLateError) se traduce a last_minute', async () => {
    createBookingMock.mockRejectedValue(new OnsiteBookingTooLateError());
    const err = await createOnsiteBooking(
      { serviceId: SERVICE_ID, slotStartIso: isoIn(180) },
      'client-1',
      NOW,
    ).catch((e: unknown) => e);
    expect((err as OnsitePaymentNotAllowedError).reason).toBe('last_minute');
  });

  it('servicio inexistente → ServiceNotFoundError', async () => {
    availabilityRepoMock.findServiceForAvailability.mockResolvedValue(null);
    await expect(
      createOnsiteBooking({ serviceId: SERVICE_ID, slotStartIso: isoIn(180) }, 'client-1', NOW),
    ).rejects.toBeInstanceOf(ServiceNotFoundError);
  });

  it('input inválido → ZodError', async () => {
    await expect(
      createOnsiteBooking({ serviceId: 'x', slotStartIso: 'mañana' }, 'client-1', NOW),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe('getPaymentOptions', () => {
  it('disponible con sesión y negocio dispuesto', async () => {
    await expect(
      getPaymentOptions({ serviceId: SERVICE_ID, slotStartIso: isoIn(180) }, 'client-1', NOW),
    ).resolves.toEqual({ online: 'available', onsite: 'available', restrictedUntilIso: null });
  });

  it('sin sesión no consulta sanciones', async () => {
    await getPaymentOptions({ serviceId: SERVICE_ID, slotStartIso: isoIn(180) }, null, NOW);
    expect(eligibilityMock).not.toHaveBeenCalled();
  });

  it('negocio que no lo ofrece → not_offered', async () => {
    findStatusMock.mockResolvedValue({ acceptsOnsitePayment: false, billing: null });
    await expect(
      getPaymentOptions({ serviceId: SERVICE_ID, slotStartIso: isoIn(180) }, 'client-1', NOW),
    ).resolves.toMatchObject({ onsite: 'not_offered' });
  });

  it('cliente bloqueado → fecha en ISO', async () => {
    const until = new Date('2027-01-15T10:00:00Z');
    eligibilityMock.mockResolvedValue({
      allowed: false,
      restrictedUntil: until,
      sanctionsInWindow: 3,
    });
    await expect(
      getPaymentOptions({ serviceId: SERVICE_ID, slotStartIso: isoIn(180) }, 'client-1', NOW),
    ).resolves.toEqual({
      online: 'available',
      onsite: 'client_restricted',
      restrictedUntilIso: until.toISOString(),
    });
  });
});
