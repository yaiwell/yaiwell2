import 'server-only';

import type Stripe from 'stripe';

import { MissingBookingReferenceError, BookingForCheckoutNotFoundError } from './checkout.errors';
import { reportCheckoutWarning } from './checkout.payment-intent';
import { refundRepository } from './checkout.refund.repository';
import { checkoutRepository } from './checkout.repository';
import type { BookingTransitionResult } from './checkout.types';

/**
 * Fallos asíncronos de reembolsos (`charge.refund.updated`).
 *
 * Que Stripe acepte un refund no garantiza que el dinero llegue: puede
 * pasar a `failed` horas después (tarjeta cancelada, cuenta cerrada). Sin
 * este handler la reserva quedaría como reembolsada y nadie se enteraría.
 */

/** Estados en los que un refund nuestro puede estar pendiente de devolver. */
const QUEUEABLE_STATUSES = new Set(['cancelled', 'refunded']);

/**
 * Mete en la cola de /admin la reserva de un refund que ha fallado.
 *
 * Solo actúa si el refund es **nuestro** (`stripeRefundId === refund.id`)
 * y la reserva está muerta (`cancelled` o `refunded`). Cualquier otro
 * refund fallido (p. ej. uno parcial de cortesía hecho a mano sobre una
 * reserva viva) no entra en la cola: desde ahí admin emitiría un refund
 * ÍNTEGRO sobre un servicio que sigue en pie. Ese caso solo se avisa a
 * Sentry para que soporte lo mire en el dashboard.
 *
 * @param refund — objeto `Refund` del evento.
 * @param now — instante de proceso; inyectable en tests.
 * @throws MissingBookingReferenceError — el refund no referencia ningún intent.
 * @throws BookingForCheckoutNotFoundError — no hay reserva para ese refund.
 */
export async function recordAsyncRefundFailure(
  refund: Stripe.Refund,
  now: Date = new Date(),
): Promise<BookingTransitionResult> {
  const booking = await resolveRefundBooking(refund);
  const unchanged = { bookingId: booking.id, changed: false, status: booking.status };

  if (refund.status !== 'failed') return unchanged;

  const reason = `refund_failed: ${refund.failure_reason ?? 'unknown'}`;
  const isOwnRefund = booking.stripeRefundId === refund.id;
  if (!isOwnRefund || !QUEUEABLE_STATUSES.has(booking.status)) {
    console.error('[checkout/refund-events] foreign refund failed; not queued:', booking.id);
    reportCheckoutWarning(
      `Refund ${refund.id} failed (${reason}) on booking ${booking.status}; not queued, review manually.`,
      booking.id,
      'error',
    );
    return unchanged;
  }

  await refundRepository.recordAsyncFailure(booking.id, now, reason);
  console.error('[checkout/refund-events] refund failed asynchronously:', booking.id, reason);
  reportCheckoutWarning(
    `Refund ${refund.id} failed asynchronously (${reason}).`,
    booking.id,
    'error',
  );
  return { bookingId: booking.id, changed: true, status: 'cancelled', delayedRefund: refund.id };
}

/** Reserva del refund: por `stripeRefundId` y, si no, por su PaymentIntent. */
async function resolveRefundBooking(
  refund: Stripe.Refund,
): Promise<{ id: string; status: string; stripeRefundId: string | null }> {
  const byRefund = await refundRepository.findByStripeRefundId(refund.id);
  if (byRefund) return byRefund;

  const paymentIntentId =
    typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id;
  if (!paymentIntentId) {
    throw new MissingBookingReferenceError();
  }
  const byIntent = await checkoutRepository.findByPaymentIntentId(paymentIntentId);
  if (!byIntent) {
    throw new BookingForCheckoutNotFoundError();
  }
  return byIntent;
}
