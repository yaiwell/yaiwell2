import 'server-only';

import {
  BookingForCheckoutNotFoundError,
  RefundNotDismissableError,
  RefundNotInQueueError,
} from './checkout.errors';
import { retrievePaymentIntentWithCharge } from './checkout.payment-intent';
import { refundRepository } from './checkout.refund.repository';
import { dismissBookingRefundSchema } from './checkout.validation';

/**
 * Descarte manual de entradas de la cola de reembolsos (/admin).
 *
 * Existe para las entradas sin salida: cuando el proveedor cancela una
 * `pending` y Stripe no responde al cancelar su PaymentIntent, la reserva
 * entra en la cola por precaución (`pi_cancel_failed`). Si nunca hubo
 * cobro, reintentar falla siempre y la entrada se quedaría para siempre.
 *
 * Descartar **no mueve dinero ni cambia el estado** de la reserva: solo
 * la saca de la cola y deja constancia de quién, cuándo y por qué. La
 * autorización de admin vive en la server action, como en el reintento.
 */

/** Resultado de un descarte aplicado. */
export interface DismissRefundResult {
  bookingId: string;
  dismissedAt: Date;
}

/**
 * Descarta la entrada de la cola de una reserva.
 *
 * @param input — payload crudo `{ bookingId, reason }` (validado con Zod;
 *   el motivo se recorta y exige un mínimo de caracteres).
 * @param adminUserId — `User.id` interno del admin, para la auditoría.
 * @param options.now — instante del descarte; inyectable en tests.
 * @throws BookingForCheckoutNotFoundError — la reserva no existe.
 * @throws RefundNotInQueueError — no está en la cola (nunca falló, ya se
 *   devolvió, ya estaba descartada o cambió en paralelo).
 * @throws RefundNotDismissableError — la reserva no está `cancelled`, o
 *   Stripe dice que su pago está cobrado (o cobrándose) sin reembolso total.
 * @throws cualquier error de Stripe al consultar el pago: ante la duda no
 *   se descarta.
 */
export async function dismissBookingRefund(
  input: unknown,
  adminUserId: string,
  options: { now?: Date } = {},
): Promise<DismissRefundResult> {
  const { bookingId, reason } = dismissBookingRefundSchema.parse(input);
  const dismissedAt = options.now ?? new Date();

  const state = await refundRepository.findRefundState(bookingId);
  if (!state) {
    throw new BookingForCheckoutNotFoundError('La reserva no existe.');
  }
  if (!state.refundFailedAt || state.refundedAt || state.refundDismissedAt) {
    throw new RefundNotInQueueError();
  }
  // Solo una reserva muerta puede quedarse sin reembolso: descartar el de
  // una viva (`confirmed`/`completed`) escondería un problema real.
  if (state.status !== 'cancelled') {
    throw new RefundNotDismissableError();
  }

  // Lo que la cola no sabe lo sabe Stripe: si hubo cobro y no se ha
  // devuelto entero, descartar sería quedarse el dinero del cliente.
  if (state.stripePaymentIntentId && (await holdsUnrefundedMoney(state.stripePaymentIntentId))) {
    throw new RefundNotDismissableError(
      'El pago de la reserva está cobrado y sin reembolso total; no se puede descartar.',
    );
  }

  const applied = await refundRepository.dismissIfQueued(bookingId, {
    dismissedAt,
    dismissedBy: adminUserId,
    reason,
  });
  if (!applied) {
    // Entre la lectura y la escritura la fila salió de la cola (webhook
    // `charge.refunded`, reintento en otra pestaña).
    throw new RefundNotInQueueError();
  }

  // Rastro en logs además de en BD; sin el motivo, que es texto libre.
  console.warn('[checkout/refund-dismiss] refund queue entry dismissed:', bookingId, adminUserId);
  return { bookingId, dismissedAt };
}

/**
 * `true` si el PaymentIntent tiene dinero del cliente sin devolver entero:
 * pago en curso, o cobrado (`succeeded`/`requires_capture`) con un cargo
 * cuyo `amount_refunded` no cubre el importe. Un intent cancelado o
 * todavía en `requires_*` no ha cobrado nada.
 */
async function holdsUnrefundedMoney(paymentIntentId: string): Promise<boolean> {
  const { intent, charge } = await retrievePaymentIntentWithCharge(paymentIntentId);
  if (intent.status === 'processing') return true;
  if (intent.status !== 'succeeded' && intent.status !== 'requires_capture') return false;
  // Cobrado sin cargo legible: ante la duda, hay dinero.
  if (!charge) return true;
  return charge.amount_refunded < charge.amount;
}
