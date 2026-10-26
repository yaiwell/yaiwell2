import 'server-only';

import { pickLocalized } from '@/lib/i18n';
import type { LocalizedText } from '@/types/domain';

import { BookingForCheckoutNotFoundError, RefundNotInQueueError } from './checkout.errors';
import { issueBookingRefund } from './checkout.refund.issue';
import { refundRepository } from './checkout.refund.repository';
import type { PendingRefundSummary, RetryRefundResult } from './checkout.types';
import { retryBookingRefundSchema } from './checkout.validation';

/**
 * Cola de reembolsos fallidos para soporte (/admin).
 *
 * Solo lectura y reintento: la autorización de admin vive en la server
 * action que llama a estas funciones, no aquí, para que el dominio siga
 * siendo testeable sin sesión.
 */

/**
 * Lista las reservas con un reembolso fallido y aún no confirmado por
 * Stripe (`refundFailedAt != null && refundedAt == null`), las más
 * antiguas primero: es el dinero que más tiempo lleva esperando.
 */
export async function listPendingRefunds(): Promise<PendingRefundSummary[]> {
  const rows = await refundRepository.findPending();

  return rows.flatMap((row) => {
    // El `where` ya garantiza `refundFailedAt`; el guard estrecha el tipo.
    if (!row.refundFailedAt) return [];
    return [
      {
        bookingId: row.id,
        providerName: row.provider.businessName,
        serviceName: pickLocalized(row.service.name as LocalizedText, 'es'),
        clientEmail: row.client.email,
        priceCents: row.priceCents,
        startAt: row.startAt,
        cancelledAt: row.cancelledAt,
        refundFailedAt: row.refundFailedAt,
        refundFailureReason: row.refundFailureReason,
        stripePaymentIntentId: row.stripePaymentIntentId,
      },
    ];
  });
}

/**
 * Reintenta el reembolso de una reserva de la cola.
 *
 * Usa una clave de idempotencia **nueva por intento**
 * (`booking_refund_<id>_retry_<refundFailedAt ms>`). Stripe guarda la
 * respuesta de un error 4xx durante 24 h: con la clave original el
 * reintento devolvería el mismo error cacheado sin volver a intentarlo.
 *
 * Es seguro frente a dinero duplicado: el refund es íntegro (sin
 * `amount`), así que si un intento anterior sí llegó a devolver el
 * dinero Stripe responde `charge_already_refunded`, que cuenta como
 * éxito. Y como cada fallo reescribe `refundFailedAt`, dos clics sobre
 * el mismo estado de la cola comparten clave y no emiten dos veces.
 *
 * @param input — payload crudo `{ bookingId }` (validado con Zod).
 * @throws BookingForCheckoutNotFoundError — la reserva no existe.
 * @throws RefundNotInQueueError — la reserva no tiene un refund fallido
 *   pendiente o no está `cancelled` (mismo código para la action de admin).
 */
export async function retryBookingRefund(input: unknown): Promise<RetryRefundResult> {
  const { bookingId } = retryBookingRefundSchema.parse(input);

  const state = await refundRepository.findRefundState(bookingId);
  if (!state) {
    throw new BookingForCheckoutNotFoundError('La reserva no existe.');
  }
  if (!state.refundFailedAt || state.refundedAt) {
    throw new RefundNotInQueueError();
  }
  // Un refund íntegro solo tiene sentido sobre una reserva muerta. Si la
  // fila está viva (`confirmed`/`completed`, p. ej. tras un refund parcial
  // manual que falló), reintentar devolvería el servicio entero.
  if (state.status !== 'cancelled') {
    throw new RefundNotInQueueError('La reserva no está cancelada; no admite reembolso íntegro.');
  }
  if (!state.stripePaymentIntentId) {
    return { bookingId, refund: 'not_applicable', stripeRefundId: null };
  }

  const { outcome, stripeRefundId } = await issueBookingRefund(
    bookingId,
    state.stripePaymentIntentId,
    { idempotencyKey: retryIdempotencyKey(bookingId, state.refundFailedAt) },
  );
  return {
    bookingId,
    refund: outcome === 'failed' ? 'failed' : 'succeeded',
    stripeRefundId,
  };
}

/** Clave de un reintento manual: única por fallo registrado. */
function retryIdempotencyKey(bookingId: string, refundFailedAt: Date): string {
  return `booking_refund_${bookingId}_retry_${refundFailedAt.getTime()}`;
}
