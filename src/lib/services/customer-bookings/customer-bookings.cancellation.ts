import { canCancelBooking } from '@/lib/utils/booking-cancellation';
import { isLastMinuteAtCreation } from '@/lib/utils/booking-last-minute';

import type { BookingStatus, CustomerBookingCancellation } from './customer-bookings.types';

/** Lo mínimo de la reserva que decide si el cliente puede cancelarla. */
interface CancellationInput {
  status: BookingStatus;
  startAt: Date;
  createdAt: Date;
  priceCents: number;
  stripePaymentIntentId: string | null;
}

/**
 * Decide qué ofrece la card sobre cancelar, con las mismas reglas y el
 * mismo orden que `cancelBookingByClient` (§4.bis). La UI solo refleja
 * este veredicto; el servidor lo vuelve a comprobar al recibir la
 * petición.
 *
 *  - `pending` (sin cobro): hasta el inicio, sea o no de última hora
 *    (decidido 2026-10-29); `untilStart` le dice a la UI que no vigile
 *    la ventana de 2 h.
 *  - `confirmed`: última hora nunca; el resto, hasta 2 h antes.
 *
 * `refundCents` solo existe si hay cobro online confirmado: una `pending`
 * no se ha cobrado, y una reserva sin PaymentIntent (pago en el local,
 * cuando exista) se cancela sin reembolso.
 *
 * @param booking — reserva leída de BD.
 * @param now — reloj del servidor; el mismo que reparte las secciones.
 */
export function resolveCancellation(
  booking: CancellationInput,
  now: Date,
): CustomerBookingCancellation {
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return { kind: 'none' };
  }
  if (booking.status === 'pending') {
    return booking.startAt.getTime() > now.getTime()
      ? { kind: 'allowed', refundCents: null, untilStart: true }
      : { kind: 'tooLate' };
  }
  if (isLastMinuteAtCreation(booking.startAt, booking.createdAt)) {
    return { kind: 'lastMinute' };
  }
  if (!canCancelBooking(booking, now)) {
    return { kind: 'tooLate' };
  }
  const paidOnline = booking.stripePaymentIntentId !== null;
  return {
    kind: 'allowed',
    refundCents: paidOnline ? booking.priceCents : null,
    untilStart: false,
  };
}
