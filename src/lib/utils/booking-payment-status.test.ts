import { describe, expect, it } from 'vitest';

import { isBookingPaymentSettled } from './booking-payment-status';

/**
 * Tests del criterio "¿puedo decir que la reserva está confirmada?".
 *
 * Lo comparten la página `/confirmacion` y la server action que
 * consulta el estado desde el camino sin 3DS. Que `pending` no cuente
 * como confirmado es justo el bug que este módulo viene a cerrar.
 */

describe('isBookingPaymentSettled', () => {
  it('sólo da por liquidada una reserva confirmada o ya atendida', () => {
    expect(isBookingPaymentSettled('confirmed')).toBe(true);
    expect(isBookingPaymentSettled('completed')).toBe(true);
  });

  it('no da por confirmada una reserva pendiente del webhook', () => {
    expect(isBookingPaymentSettled('pending')).toBe(false);
  });

  it('no presenta como confirmada una reserva cancelada o reembolsada', () => {
    expect(isBookingPaymentSettled('cancelled')).toBe(false);
    expect(isBookingPaymentSettled('refunded')).toBe(false);
  });

  it('trata un estado desconocido como no liquidado', () => {
    expect(isBookingPaymentSettled('')).toBe(false);
    expect(isBookingPaymentSettled('whatever')).toBe(false);
  });
});
