import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { isExclusionViolation } from '@/lib/db/prisma-errors';
import { bookingRepository, isBookingHoldingSlot } from '@/lib/services/booking';

import { reportCheckoutWarning } from './checkout.payment-intent';
import { issueBookingRefund } from './checkout.refund.issue';
import { checkoutRepository, type CheckoutBookingRow } from './checkout.repository';
import type { BookingTransitionResult, RefundOutcome } from './checkout.types';

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
  return { bookingId: booking.id, changed: false, status: 'cancelled', ...lateRefund(outcome) };
}

/**
 * Resuelve un `succeeded` sobre una reserva `pending`.
 *
 *  - Franja ya empezada o pasada: cancelar y reembolsar.
 *  - Retención vigente al pagar y todavía ahora: confirmar.
 *  - En otro caso, confirmar si la franja sigue libre; si otra reserva
 *    activa la ocupa, cancelar y reembolsar. La comprobación y la
 *    confirmación van bajo el bloqueo por profesional que también toma
 *    `createBooking`: sin él, un cliente podía coger el hueco (p. ej.
 *    liberado con descuento) entre nuestra lectura y nuestra escritura y
 *    quedaban dos reservas activas en la misma franja.
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
    // Retención vigente: nuestra `pending` aún cuenta como activa y
    // `createBooking` no puede dar la franja a otro; no hace falta bloqueo.
    const decision = await confirmGuarded(() => checkoutRepository.confirmIfPending(booking.id));
    if (decision === 'confirmed') return confirmed(booking);
    if (decision === 'not-pending') return followCurrentState(booking, paymentIntentId);
    return cancelAndRefund(booking, paymentIntentId, clock.now, 'slot taken (db overlap guard)');
  }

  const decision = await confirmIfSlotFree(booking, clock.now);
  if (decision === 'confirmed') return confirmed(booking);
  if (decision === 'not-pending') return followCurrentState(booking, paymentIntentId);

  if (heldWhenPaid) {
    // Pagó a tiempo y aun así pierde la franja: el webhook llegó tarde.
    reportCheckoutWarning(
      `Booking ${booking.id} paid within hold but slot taken before webhook arrived; refunded.`,
      booking.id,
      'error',
    );
  }
  // El reembolso va fuera de la transacción: una llamada a Stripe no debe
  // alargar el bloqueo, y cancelar una `pending` es seguro sin él.
  return cancelAndRefund(booking, paymentIntentId, clock.now, 'slot taken by another booking');
}

/** Resultado de intentar confirmar con la retención vencida. */
type SlotDecision = 'confirmed' | 'taken' | 'not-pending';

/**
 * Bajo el bloqueo por profesional: si ninguna otra reserva activa solapa,
 * confirma (condicional a `pending`). Solo decide y escribe en BD; las
 * acciones con Stripe las hace el llamador fuera de la transacción.
 */
async function confirmIfSlotFree(booking: CheckoutBookingRow, now: Date): Promise<SlotDecision> {
  try {
    return await lockAndConfirm(booking, now);
  } catch (err) {
    if (isExclusionViolation(err, OVERLAP_CONSTRAINT)) return 'taken';
    throw err;
  }
}

/**
 * Restricción de BD que impide dos `confirmed` solapadas del mismo
 * profesional (migración 9d). Es la red bajo la comprobación de la app:
 * si salta, la franja es de otro y el pago se devuelve.
 */
const OVERLAP_CONSTRAINT = 'bookings_no_overlap_confirmed';

/** Confirma sin bloqueo; una violación de la restricción cuenta como franja ocupada. */
async function confirmGuarded(confirm: () => Promise<boolean>): Promise<SlotDecision> {
  try {
    return (await confirm()) ? 'confirmed' : 'not-pending';
  } catch (err) {
    if (isExclusionViolation(err, OVERLAP_CONSTRAINT)) return 'taken';
    throw err;
  }
}

async function lockAndConfirm(booking: CheckoutBookingRow, now: Date): Promise<SlotDecision> {
  return prisma.$transaction(async (tx) => {
    await bookingRepository.lockProfessional(tx, booking.professionalId);
    const overlapping = await bookingRepository.findOverlapping(
      booking.professionalId,
      booking.startAt,
      booking.endAt,
      now,
      tx,
    );
    // Excluimos la propia fila por si todavía cuenta como activa.
    if (overlapping.some((other) => other.id !== booking.id)) return 'taken';
    return (await checkoutRepository.confirmIfPending(booking.id, tx))
      ? 'confirmed'
      : 'not-pending';
  });
}

function confirmed(booking: CheckoutBookingRow): BookingTransitionResult {
  return { bookingId: booking.id, changed: true, status: 'confirmed' };
}

/**
 * Perdimos la escritura condicional: seguimos al estado real.
 * `cancelled` → reembolso; cualquier otro → sin cambios.
 */
async function followCurrentState(
  booking: CheckoutBookingRow,
  paymentIntentId: string,
): Promise<BookingTransitionResult> {
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
  return { bookingId: booking.id, changed: applied, status: 'cancelled', ...lateRefund(outcome) };
}

/**
 * Pista para avisar al cliente de un reembolso automático. Solo cuando
 * el reembolso se decidió en esta entrega: `already_refunded` es una
 * reentrega y el cliente ya fue avisado.
 */
function lateRefund(outcome: RefundOutcome): Pick<BookingTransitionResult, 'lateRefund'> {
  return outcome === 'issued' || outcome === 'failed' ? { lateRefund: outcome } : {};
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
