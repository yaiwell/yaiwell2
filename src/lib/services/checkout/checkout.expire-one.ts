import 'server-only';

import { cancelPaymentIntentForExpiry } from './checkout.payment-intent';
import { checkoutRepository } from './checkout.repository';

/**
 * Caducidad de una única reserva `pending` cuya retención ha vencido.
 *
 * La comparten el cron diario de caducidad y la comprobación previa al
 * pago (`checkout.hold-check.service`): cuando el cliente intenta pagar
 * una reserva ya vencida, la caducamos en el momento en vez de esperar
 * al cron, para que su PaymentIntent deje de aceptar pagos cuanto antes.
 */

/**
 * Desenlace de intentar caducar una `pending`.
 *
 *  - `expired`: intent cancelado (o sin intent) y reserva en `cancelled`.
 *  - `already_paid`: Stripe ya cobró; la reserva no se toca.
 *  - `processing`: el pago está en curso; la reserva no se toca.
 *  - `still_open`: Stripe no dejó cancelar (respuesta cacheada en la
 *    clave compartida) pero el intent sigue sin cobrar; se reintenta en
 *    la próxima ejecución. Ver `PaymentIntentExpiryOutcome`.
 *  - `not_pending`: la fila cambió de estado en paralelo (webhook, proveedor).
 */
export type PendingExpiryAttempt =
  | 'expired'
  | 'already_paid'
  | 'processing'
  | 'still_open'
  | 'not_pending';

/**
 * Clave de idempotencia de la cancelación por caducidad. Es la misma en
 * todos los caminos que caducan una reserva: si el cron y la
 * comprobación previa al pago coinciden, Stripe ve una única petición.
 */
export function expiryIdempotencyKey(bookingId: string): string {
  return `booking_expire_${bookingId}`;
}

/**
 * Caduca una reserva: primero Stripe, luego BD.
 *
 * El orden importa. Si cancelásemos en BD y Stripe dijese después que
 * el intent ya estaba cobrado, tendríamos una reserva muerta con dinero
 * dentro. Cancelando antes el intent, el "no cancelable" de Stripe nos
 * avisa a tiempo de dejar la reserva en paz.
 *
 * No comprueba que la retención haya vencido: es responsabilidad del
 * caller (el cron filtra por `createdAt`; la comprobación previa al pago
 * usa `isBookingHoldingSlot`).
 *
 * @param booking — id y PaymentIntent anclado de la reserva.
 * @param now — instante de la cancelación.
 * @throws cualquier error de Stripe o de BD; el caller decide si es fatal.
 */
export async function tryExpirePendingBooking(
  booking: { id: string; stripePaymentIntentId: string | null },
  now: Date,
): Promise<PendingExpiryAttempt> {
  if (booking.stripePaymentIntentId) {
    const outcome = await cancelPaymentIntentForExpiry(
      booking.stripePaymentIntentId,
      expiryIdempotencyKey(booking.id),
    );
    if (outcome !== 'canceled') return outcome;
  }
  // Condicional: si el webhook la confirmó en paralelo, no la pisamos.
  const applied = await checkoutRepository.cancelIfPending(booking.id, now);
  return applied ? 'expired' : 'not_pending';
}
