import 'server-only';

import {
  cancelBookingPaymentIntent,
  classifyPaymentIntent,
  reportCheckoutWarning,
  type PaymentIntentCancelOutcome,
} from './checkout.payment-intent';
import { describeStripeCode, issueBookingRefund } from './checkout.refund.issue';
import { refundRepository } from './checkout.refund.repository';
import type {
  BookingCancellationResult,
  CancellationActor,
  CancelledBookingSnapshot,
} from './checkout.types';

/**
 * Qué pasa con el dinero cuando una reserva ya se ha cancelado en BD,
 * la cancele el centro o el cliente (§4.bis de CLAUDE.md).
 *
 * Es la segunda mitad de toda cancelación: el dominio `booking` aplica
 * las reglas y persiste el cambio, y aquí se devuelve el cobro o se
 * cancela el intent vivo. Un solo camino para los dos actores: la clave
 * de idempotencia, la cola de /admin y las carreras con el webhook no
 * pueden divergir según quién cancele.
 */

/**
 * Resuelve el dinero de una reserva recién cancelada.
 *
 * **Orden BD → Stripe, sin rollback**: la cancelación ya liberó el hueco
 * (irreversible) y el reembolso es reintentable con su clave de
 * idempotencia. Si Stripe falla, queda una cancelación correcta con un
 * reembolso pendiente en la cola de /admin.
 *
 * Nunca lanza: la cancelación ya está comprometida.
 *  - Sin PaymentIntent: no hubo cobro online (p. ej. pago en el local,
 *    cuando exista); cancelar solo libera el hueco.
 *  - `pending`: se cancela el intent para que nadie pague una reserva
 *    muerta; si en la carrera ya se cobró, se reembolsa en el acto.
 *  - `confirmed`: reembolso íntegro.
 *
 * @param cancelled — reserva ya cancelada con su `previousStatus`.
 * @param actor — quién canceló; va en los logs y alertas para soporte.
 */
export async function settleCancelledBookingPayment(
  cancelled: CancelledBookingSnapshot,
  actor: CancellationActor,
): Promise<BookingCancellationResult> {
  const bookingId = cancelled.id;
  const paymentIntentId = cancelled.stripePaymentIntentId;

  if (!paymentIntentId) {
    return notApplicable(bookingId);
  }

  if (cancelled.previousStatus === 'pending') {
    const outcome = await cancelPendingPaymentIntent(bookingId, paymentIntentId, actor);
    if (outcome === 'queued') {
      // No sabemos si hubo cobro: la reserva ya está en la cola de admin.
      return {
        bookingId,
        status: 'cancelled',
        refund: 'failed',
        stripeRefundId: null,
        paymentUncertain: true,
      };
    }
    if (outcome !== 'already_paid') {
      return notApplicable(bookingId);
    }
    // Carrera: el pago entró entre nuestra lectura y la cancelación. El
    // webhook pudo procesarse ya (y no volverá a llegar), así que el
    // reembolso no puede esperar a él. Misma clave que el pago tardío:
    // si ambos caminos disparan, Stripe emite un solo refund.
  }

  // La emisión es común a todos los caminos de reembolso (ver
  // `checkout.refund.issue.ts`): registra el desenlace y nunca lanza. Su
  // log no sabe quién canceló, así que lo dejamos dicho aquí.
  const { outcome, stripeRefundId } = await issueBookingRefund(bookingId, paymentIntentId);
  if (outcome === 'failed') {
    console.error(`[checkout/refund] refund after ${actor} cancellation queued:`, bookingId);
  }
  return { bookingId, status: 'cancelled', refund: outcome, stripeRefundId };
}

function notApplicable(bookingId: string): BookingCancellationResult {
  return { bookingId, status: 'cancelled', refund: 'not_applicable', stripeRefundId: null };
}

/**
 * Cancela el PaymentIntent de una reserva `pending` recién cancelada.
 *
 * Nunca lanza: la reserva ya está cancelada en BD y el hueco liberado.
 *  - `canceled`: nada más que hacer.
 *  - `already_paid`: el caller reembolsa en el acto.
 *  - `processing`: si el pago acaba cobrándose, el webhook del pago
 *    tardío lo reembolsa; aquí solo se registra.
 *  - `queued`: Stripe falló al cancelar y no pudimos confirmar el estado
 *    real del intent. Como el pago pudo entrar en la carrera, la reserva
 *    entra en la cola de admin (`pi_cancel_failed: <código>`) en vez de
 *    darla por resuelta.
 */
async function cancelPendingPaymentIntent(
  bookingId: string,
  paymentIntentId: string,
  actor: CancellationActor,
): Promise<PaymentIntentCancelOutcome | 'queued'> {
  let outcome: PaymentIntentCancelOutcome | 'inconclusive';
  let failureCode: string | null = null;
  try {
    outcome = await cancelBookingPaymentIntent(paymentIntentId, `booking_cancel_pi_${bookingId}`);
  } catch (err) {
    failureCode = describeStripeCode(err);
    console.error(
      `[checkout/refund] failed to cancel PaymentIntent after ${actor} cancellation:`,
      bookingId,
      failureCode,
    );
    outcome = await classifyAfterFailure(paymentIntentId);
  }

  if (outcome === 'inconclusive') {
    const reason = `pi_cancel_failed: ${failureCode ?? 'unknown_error'}`;
    reportCheckoutWarning(
      `Pending booking ${bookingId} cancelled by ${actor} queued: ${reason}.`,
      bookingId,
      'error',
    );
    await refundRepository.recordFailed(bookingId, new Date(), reason);
    return 'queued';
  }
  if (outcome !== 'canceled') {
    const message = `PaymentIntent ${outcome} while ${actor} cancelled pending booking ${bookingId}.`;
    console.warn('[checkout/refund]', message);
    reportCheckoutWarning(message, bookingId);
  }
  return outcome;
}

/** Tras un fallo al cancelar, consulta el estado real; si falla también, no concluye. */
async function classifyAfterFailure(
  paymentIntentId: string,
): Promise<PaymentIntentCancelOutcome | 'inconclusive'> {
  try {
    return await classifyPaymentIntent(paymentIntentId);
  } catch {
    return 'inconclusive';
  }
}
