import 'server-only';

import { cancelBookingByProvider } from '@/lib/services/booking';

import {
  cancelBookingPaymentIntent,
  classifyPaymentIntent,
  reportCheckoutWarning,
  type PaymentIntentCancelOutcome,
} from './checkout.payment-intent';
import { describeStripeCode, issueBookingRefund } from './checkout.refund.issue';
import { refundRepository } from './checkout.refund.repository';
import type { ProviderCancellationResult } from './checkout.types';
import { cancelBookingWithRefundSchema } from './checkout.validation';

/**
 * Cancelación de una reserva por el proveedor con devolución íntegra
 * del dinero al cliente (§4.bis de CLAUDE.md).
 *
 * `booking.service` sólo sabe de estados; el dinero vive aquí, en el
 * módulo que ya conoce Stripe Connect. Así el dominio `booking` sigue
 * siendo testeable sin SDK de pagos.
 */

export type { ProviderCancellationResult } from './checkout.types';

/**
 * Cancela una reserva desde el panel del proveedor y devuelve el
 * importe íntegro al cliente.
 *
 * **Orden BD → Stripe, sin rollback.** La cancelación es *irreversible*
 * en términos de negocio: al aplicarla se libera el hueco y otro cliente
 * puede cogerlo en el mismo segundo, así que deshacerla no es una opción
 * real. El reembolso, en cambio, es *reintentable*: va con idempotency
 * key, de modo que repetirlo no duplica dinero. Entre un paso
 * irreversible y uno reintentable, se compromete primero el
 * irreversible; si el segundo falla, queda una cancelación correcta con
 * un reembolso pendiente, que soporte puede completar. Al revés
 * tendríamos dinero devuelto sobre una reserva todavía viva.
 *
 * Las reglas de negocio (titularidad, ventana de 2 h, estado cancelable)
 * las aplica `cancelBookingByProvider` y sus errores se propagan tal
 * cual: ocurren **antes** de tocar dinero.
 *
 * @param input — payload crudo con el `bookingId` (validado con Zod).
 * @param providerUserId — `User.id` del proveedor autenticado.
 * @returns el desenlace de la cancelación y del reembolso.
 * @throws BookingNotFoundError — la reserva no existe.
 * @throws UnauthorizedCancellationError — el usuario no es el dueño.
 * @throws BookingNotCancellableError — el estado actual no admite cancelación.
 * @throws BookingTooLateToCancelError — faltan menos de 2 h para el inicio.
 */
export async function cancelBookingByProviderWithRefund(
  input: unknown,
  providerUserId: string,
): Promise<ProviderCancellationResult> {
  const { bookingId } = cancelBookingWithRefundSchema.parse(input);

  // `previousStatus` sale de la misma lectura con la que el dominio
  // booking validó la cancelación: sin snapshot aparte, una ventana de
  // carrera menos con el webhook.
  const cancelled = await cancelBookingByProvider({ bookingId }, providerUserId);
  const paymentIntentId = cancelled.stripePaymentIntentId;

  if (!paymentIntentId) {
    // Sin intent anclado nunca hubo cobro: cancelar solo libera el hueco.
    return notApplicable(bookingId);
  }

  if (cancelled.previousStatus === 'pending') {
    // Sin cobro (en nuestra lectura), pero el intent sigue vivo: lo
    // cancelamos para que el cliente no pueda pagar una reserva muerta.
    // Va DESPUÉS de BD por el mismo motivo que el refund.
    const outcome = await cancelPendingPaymentIntent(bookingId, paymentIntentId);
    if (outcome === 'queued') {
      // No sabemos si hubo cobro: la reserva ya está en la cola de admin.
      return { bookingId, status: 'cancelled', refund: 'failed', stripeRefundId: null };
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
  // `checkout.refund.issue.ts`): registra el desenlace y nunca lanza.
  const { outcome, stripeRefundId } = await issueBookingRefund(bookingId, paymentIntentId);
  return { bookingId, status: 'cancelled', refund: outcome, stripeRefundId };
}

function notApplicable(bookingId: string): ProviderCancellationResult {
  return { bookingId, status: 'cancelled', refund: 'not_applicable', stripeRefundId: null };
}

/**
 * Cancela el PaymentIntent de una reserva `pending` que el proveedor
 * acaba de cancelar.
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
): Promise<PaymentIntentCancelOutcome | 'queued'> {
  let outcome: PaymentIntentCancelOutcome | 'inconclusive';
  let failureCode: string | null = null;
  try {
    outcome = await cancelBookingPaymentIntent(paymentIntentId, `booking_cancel_pi_${bookingId}`);
  } catch (err) {
    failureCode = describeStripeCode(err);
    console.error('[checkout/refund] failed to cancel PaymentIntent:', bookingId, failureCode);
    outcome = await classifyAfterFailure(paymentIntentId);
  }

  if (outcome === 'inconclusive') {
    const reason = `pi_cancel_failed: ${failureCode ?? 'unknown_error'}`;
    reportCheckoutWarning(`Pending booking ${bookingId} queued: ${reason}.`, bookingId, 'error');
    await refundRepository.recordFailed(bookingId, new Date(), reason);
    return 'queued';
  }
  if (outcome !== 'canceled') {
    const message = `PaymentIntent ${outcome} while provider cancelled pending booking ${bookingId}.`;
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
