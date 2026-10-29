import { describe, expect, it } from 'vitest';

import { resolveCancellation } from './customer-bookings.cancellation';

/**
 * Veredicto de cancelación que pinta la card de `/mis-reservas`. Debe
 * coincidir con lo que aceptará `cancelBookingByClient` en el servidor.
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');
const HOUR = 60 * 60_000;

function input(overrides: Partial<Parameters<typeof resolveCancellation>[0]> = {}) {
  return {
    status: 'confirmed' as const,
    startAt: new Date(NOW.getTime() + 24 * HOUR),
    createdAt: new Date(NOW.getTime() - 24 * HOUR),
    priceCents: 4500,
    stripePaymentIntentId: 'pi_1' as string | null,
    ...overrides,
  };
}

describe('resolveCancellation', () => {
  it('confirmada y pagada online con margen: se puede, con reembolso íntegro', () => {
    expect(resolveCancellation(input(), NOW)).toEqual({
      kind: 'allowed',
      refundCents: 4500,
      untilStart: false,
    });
  });

  it('a 2h00 del inicio todavía se puede', () => {
    const startAt = new Date(NOW.getTime() + 2 * HOUR);
    expect(resolveCancellation(input({ startAt }), NOW).kind).toBe('allowed');
  });

  it('a 1h59 ya no', () => {
    const startAt = new Date(NOW.getTime() + 2 * HOUR - 60_000);
    expect(resolveCancellation(input({ startAt }), NOW)).toEqual({ kind: 'tooLate' });
  });

  it('una confirmada de última hora nunca, aunque falte mucho', () => {
    const startAt = new Date(NOW.getTime() + 3 * HOUR);
    const createdAt = new Date(startAt.getTime() - 2 * HOUR + 60_000);
    expect(resolveCancellation(input({ startAt, createdAt }), NOW)).toEqual({
      kind: 'lastMinute',
    });
  });

  it('una pending se puede cancelar sin nada que devolver, hasta el inicio', () => {
    expect(resolveCancellation(input({ status: 'pending' }), NOW)).toEqual({
      kind: 'allowed',
      refundCents: null,
      untilStart: true,
    });
  });

  it('una pending de última hora también (no hay cobro)', () => {
    const startAt = new Date(NOW.getTime() + 45 * 60_000);
    const createdAt = new Date(NOW.getTime() - 5 * 60_000);
    expect(resolveCancellation(input({ status: 'pending', startAt, createdAt }), NOW)).toEqual({
      kind: 'allowed',
      refundCents: null,
      untilStart: true,
    });
  });

  it('una pending que ya ha empezado, no', () => {
    expect(resolveCancellation(input({ status: 'pending', startAt: NOW }), NOW)).toEqual({
      kind: 'tooLate',
    });
  });

  it('sin PaymentIntent (pago en el local, futuro) no hay reembolso', () => {
    expect(resolveCancellation(input({ stripePaymentIntentId: null }), NOW)).toEqual({
      kind: 'allowed',
      refundCents: null,
      untilStart: false,
    });
  });

  it.each(['completed', 'cancelled', 'refunded'] as const)('%s: nada que ofrecer', (status) => {
    expect(resolveCancellation(input({ status }), NOW)).toEqual({ kind: 'none' });
  });
});
