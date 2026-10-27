import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del mapeo de errores de `createBookingCheckoutAction`.
 *
 * Lo que se fija: cuando el hueco ya no respeta la antelación mínima,
 * la action devuelve `SLOT_TOO_SOON` y no el `VALIDATION` genérico,
 * aunque ambos lleguen como `ZodError`. Así la UI puede ofrecer "elegir
 * otro hueco" en vez de un "algo ha ido mal".
 *
 * `mapCheckoutError` no se exporta (un fichero `'use server'` solo
 * puede exportar acciones), así que lo probamos a través de la action.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'clerk_1' })),
}));

vi.mock('@/lib/services/user', () => ({
  ensureUserFromClerk: vi.fn(async () => ({ id: 'user-1' })),
}));

const checkoutMock = vi.hoisted(() => ({ createBookingCheckout: vi.fn() }));

vi.mock('@/lib/services/checkout', () => {
  class Stub extends Error {}
  return {
    createBookingCheckout: checkoutMock.createBookingCheckout,
    getBookingForConfirmation: vi.fn(),
    PaymentIntentCreationError: class PaymentIntentCreationError extends Stub {},
    ProfessionalNotResolvedError: class ProfessionalNotResolvedError extends Stub {},
    ProviderNotChargeableError: class ProviderNotChargeableError extends Stub {},
  };
});

vi.mock('@/lib/services/payments', () => ({
  StripeOperationError: class StripeOperationError extends Error {},
}));

// Errores y detector reales del dominio booking, sin arrastrar Prisma.
vi.mock('@/lib/services/booking', async () => {
  const errors = await import('@/lib/services/booking/booking.errors');
  const validation = await import('@/lib/services/booking/booking.validation');
  return { ...errors, isBookingTooSoonError: validation.isBookingTooSoonError };
});

import { createBookingSchema } from '@/lib/services/booking/booking.validation';

import { createBookingCheckoutAction } from './actions';

const INPUT = { serviceId: 'svc', slotStartIso: '2026-10-05T10:00:00.000Z' };

/** Provoca el `ZodError` real que lanza `createBookingSchema`. */
function zodErrorFor(input: Record<string, unknown>): unknown {
  const result = createBookingSchema.safeParse(input);
  if (result.success) throw new Error('El input debería ser inválido');
  return result.error;
}

const VALID_IDS = {
  serviceId: '11111111-1111-4111-8111-111111111111',
  professionalId: '22222222-2222-4222-8222-222222222222',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createBookingCheckoutAction — mapeo de errores', () => {
  it('devuelve SLOT_TOO_SOON cuando el hueco no respeta la antelación mínima', async () => {
    const tooSoon = new Date(Date.now() + 10 * 60_000).toISOString();
    checkoutMock.createBookingCheckout.mockRejectedValue(
      zodErrorFor({ ...VALID_IDS, slotStart: tooSoon }),
    );

    await expect(createBookingCheckoutAction(INPUT)).resolves.toEqual({
      ok: false,
      code: 'SLOT_TOO_SOON',
    });
  });

  it('sigue devolviendo VALIDATION para un ZodError de otro tipo', async () => {
    const farAway = new Date(Date.now() + 48 * 60 * 60_000).toISOString();
    checkoutMock.createBookingCheckout.mockRejectedValue(
      zodErrorFor({ ...VALID_IDS, serviceId: 'no-uuid', slotStart: farAway }),
    );

    await expect(createBookingCheckoutAction(INPUT)).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
  });

  it('propaga isLastMinute del servidor en el camino feliz', async () => {
    checkoutMock.createBookingCheckout.mockResolvedValue({
      bookingId: 'bk-1',
      clientSecret: 'pi_secret',
      amountCents: 4500,
      slotStartIso: '2026-10-05T10:00:00.000Z',
      slotEndIso: '2026-10-05T11:00:00.000Z',
      isLastMinute: true,
    });

    const result = await createBookingCheckoutAction(INPUT);

    expect(result).toMatchObject({ ok: true, isLastMinute: true });
  });
});
