import 'server-only';

import { bookingRepository, isBookingHoldingSlot } from '@/lib/services/booking';

import { reportCheckoutWarning } from './checkout.payment-intent';
import { issueBookingRefund } from './checkout.refund.issue';
import { checkoutRepository, type CheckoutBookingRow } from './checkout.repository';
import type { BookingTransitionResult } from './checkout.types';

/**
 * Pagos que llegan cuando la reserva ya no los espera.
 *
 * El `payment_intent.succeeded` puede llegar después de que la reserva
 * haya muerto (caducada, fallida, cancelada por el centro), después de
 * que su retención de `PENDING_HOLD_MINUTES` haya vencido y otro cliente
 * haya cogido la franja, o cuando la franja ya ha pasado. En todos esos
 * casos el dinero ya está cobrado: ignorarlo dejaría al cliente pagando
 * por nada.
 *
 * Reglas: nunca resucitamos una reserva muerta, nunca confirmamos una
 * franja que ya es de otro ni una que ya pasó. Lo que no se puede
 * confirmar se devuelve íntegro y en automático.
 *
 * **La retención no protege ante retrasos del webhook.** Se evalúa con
 * el instante del pago (`paidAt`, de `event.created`), pero las
 * consultas de disponibilidad dejan de contar la `pending` a los 30 min
 * de reloj, llegue o no el evento. Si Stripe entrega el `succeeded` tarde
 * y entretanto otro cliente cogió la franja, el pago se reembolsa aunque
 * se hiciera a tiempo; ese caso se sube a Sentry como `error` para que
 * soporte contacte con el cliente.
 */

/** Instantes de referencia de una decisión de pago tardío. */
export interface LatePaymentClock {
  /** Cuándo pagó el cliente (`event.created`). */
  paidAt: Date;
  /** Cuándo procesamos el evento. */
  now: Date;
}

/**
 * Resuelve un `succeeded` sobre una reserva `cancelled`: reembolso
 * íntegro automático, sin tocar el estado. Reentregas del webhook son
 * seguras: la emisión usa la clave de idempotencia de los caminos
 * automáticos.
 *
 * @param booking — reserva ya resuelta y en estado `cancelled`.
 * @param paymentIntentId — PaymentIntent cobrado (el del evento).
 */
export async function refundPaymentOnCancelledBooking(
  booking: CheckoutBookingRow,
  paymentIntentId: string,
): Promise<BookingTransitionResult> {
  await ensurePaymentIntentAnchored(booking, paymentIntentId);
  const { outcome } = await issueBookingRefund(booking.id, paymentIntentId);
  console.warn(
    `[checkout/late-payment] succeeded on cancelled booking; refund ${outcome}:`,
    booking.id,
  );
  return { bookingId: booking.id, changed: false, status: 'cancelled' };
}

/**
 * Resuelve un `succeeded` sobre una reserva `pending`.
 *
 *  - Franja ya empezada o pasada: cancelar y reembolsar.
 *  - Retención vigente al pagar y todavía ahora: confirmar.
 *  - En otro caso, confirmar si la franja sigue libre; si otra reserva
 *    activa la ocupa, cancelar y reembolsar.
 *
 * Toda escritura es condicional a `pending`: si otro camino (proveedor,
 * cron) movió la fila entre medias, se relee y se actúa sobre su estado
 * real, sin resucitar nada.
 *
 * @param booking — reserva ya resuelta y en estado `pending`.
 * @param paymentIntentId — PaymentIntent cobrado (el del evento).
 * @param clock — instante del pago y de proceso.
 */
export async function settlePaymentOnPendingBooking(
  booking: CheckoutBookingRow,
  paymentIntentId: string,
  clock: LatePaymentClock,
): Promise<BookingTransitionResult> {
  if (booking.startAt.getTime() <= clock.now.getTime()) {
    return cancelAndRefund(booking, paymentIntentId, clock.now, 'slot already started');
  }

  const heldWhenPaid = isBookingHoldingSlot(booking, clock.paidAt);
  if (heldWhenPaid && isBookingHoldingSlot(booking, clock.now)) {
    return confirmOrFollow(booking, paymentIntentId);
  }

  if (!(await isSlotTakenByOther(booking, clock.now))) {
    return confirmOrFollow(booking, paymentIntentId);
  }

  if (heldWhenPaid) {
    // Pagó a tiempo y aun así pierde la franja: el webhook llegó tarde.
    reportCheckoutWarning(
      `Booking ${booking.id} paid within hold but slot taken before webhook arrived; refunded.`,
      booking.id,
      'error',
    );
  }
  return cancelAndRefund(booking, paymentIntentId, clock.now, 'slot taken by another booking');
}

/**
 * Confirma si la fila sigue en `pending`. Si perdimos la carrera, sigue
 * al estado real: `cancelled` → reembolso; cualquier otro → sin cambios.
 */
async function confirmOrFollow(
  booking: CheckoutBookingRow,
  paymentIntentId: string,
): Promise<BookingTransitionResult> {
  if (await checkoutRepository.confirmIfPending(booking.id)) {
    return { bookingId: booking.id, changed: true, status: 'confirmed' };
  }
  const current = await checkoutRepository.findCheckoutRow(booking.id);
  if (current?.status === 'cancelled') {
    return refundPaymentOnCancelledBooking(current, paymentIntentId);
  }
  return { bookingId: booking.id, changed: false, status: current?.status ?? booking.status };
}

/**
 * Cancela (si sigue `pending`) y reembolsa. Si la fila ya no estaba en
 * `pending`, se relee: una reserva confirmada por otra entrega del mismo
 * evento no se toca; una ya cancelada se reembolsa igual.
 */
async function cancelAndRefund(
  booking: CheckoutBookingRow,
  paymentIntentId: string,
  now: Date,
  reason: string,
): Promise<BookingTransitionResult> {
  const applied = await checkoutRepository.cancelIfPending(booking.id, now);
  if (!applied) {
    const current = await checkoutRepository.findCheckoutRow(booking.id);
    if (current && current.status !== 'cancelled') {
      return { bookingId: booking.id, changed: false, status: current.status };
    }
  }
  await ensurePaymentIntentAnchored(booking, paymentIntentId);
  const { outcome } = await issueBookingRefund(booking.id, paymentIntentId, { now });
  console.warn(`[checkout/late-payment] ${reason}; refund ${outcome}:`, booking.id);
  return { bookingId: booking.id, changed: applied, status: 'cancelled' };
}

/**
 * ¿Hay otra reserva activa que solape con esta? Excluimos la propia
 * fila por si todavía cuenta como activa.
 */
async function isSlotTakenByOther(booking: CheckoutBookingRow, now: Date): Promise<boolean> {
  const overlapping = await bookingRepository.findOverlapping(
    booking.professionalId,
    booking.startAt,
    booking.endAt,
    now,
  );
  return overlapping.some((other) => other.id !== booking.id);
}

/**
 * Si el checkout no llegó a anclar el PaymentIntent (fallo entre crear
 * el intent y guardarlo), lo anclamos ahora: la cola de reembolsos de
 * admin necesita el id para poder reintentar.
 */
async function ensurePaymentIntentAnchored(
  booking: CheckoutBookingRow,
  paymentIntentId: string,
): Promise<void> {
  if (booking.stripePaymentIntentId) return;
  await checkoutRepository.attachPaymentIntent(booking.id, paymentIntentId);
}
