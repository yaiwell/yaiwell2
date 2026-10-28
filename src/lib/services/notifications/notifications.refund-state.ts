import type { CancellationRefundState } from './notifications.types';

/** Desenlace del reembolso tal como lo devuelve el dominio checkout. */
type RefundOutcomeLike = 'issued' | 'already_refunded' | 'not_applicable' | 'failed';

/**
 * Traduce el resultado de una cancelación del centro a lo que contamos
 * al cliente. Un reembolso fallido sigue siendo dinero que debemos (lo
 * resuelve soporte desde la cola); si ni siquiera sabemos si hubo cobro,
 * el correo no promete un importe.
 *
 * @param refund — `RefundOutcome` de `cancelBookingByProviderWithRefund`.
 * @param paymentUncertain — Stripe no pudo confirmar si hubo cobro.
 */
export function toCancellationRefundState(
  refund: RefundOutcomeLike,
  paymentUncertain = false,
): CancellationRefundState {
  if (paymentUncertain) return 'refund_uncertain';
  if (refund === 'failed') return 'refund_pending';
  if (refund === 'not_applicable') return 'no_payment';
  return 'refunded';
}
