import 'server-only';

import { RefundKeyInUseError } from './checkout.errors';
import { applyIncidentSideEffects } from './checkout.incident-refund.effects';
import { IncidentRefundNotEligibleError } from './checkout.incident-refund.errors';
import {
  incidentRefundRepository,
  type IncidentRefundRow,
} from './checkout.incident-refund.repository';
import type {
  IncidentRefundFromStatus,
  IncidentRefundResult,
} from './checkout.incident-refund.types';
import { reportCheckoutWarning } from './checkout.payment-intent';
import {
  describeStripeFailure,
  issueBookingRefund,
  type IssuedRefund,
} from './checkout.refund.issue';
import { refundRepository } from './checkout.refund.repository';

/**
 * Clave propia y no la de los caminos automáticos: esta lleva `metadata` y
 * Stripe rechaza una misma clave con parámetros distintos, de modo que un
 * `payment_intent.succeeded` reentregado que la reutilizase metería en la cola
 * un reembolso correcto. No hay riesgo de doble devolución: el refund es
 * íntegro y Stripe responde `charge_already_refunded` al segundo.
 */
function incidentRefundIdempotencyKey(bookingId: string): string {
  return `booking_refund_incident_${bookingId}`;
}

/** Parte común de cancelar y reanudar: efectos, emisión y auditoría. */
export async function settleIncidentRefund(
  row: IncidentRefundRow,
  previousStatus: IncidentRefundFromStatus,
  metadata: Record<string, string>,
  adminUserId: string,
  now: Date,
): Promise<IncidentRefundResult> {
  const bookingId = row.id;
  // `row.stripePaymentIntentId` ya lo exigió la elegibilidad.
  const paymentIntentId = row.stripePaymentIntentId ?? '';
  const slot = await applyIncidentSideEffects(row, adminUserId, now);

  const { outcome, stripeRefundId } = await issueWithAudit(
    bookingId,
    paymentIntentId,
    metadata,
    now,
  );
  const queued = outcome === 'failed' && (await isFailureRecorded(bookingId));

  // Sin el motivo: es texto libre y puede llevar datos personales.
  console.warn(
    '[checkout/incident-refund] centre incident refund:',
    bookingId,
    adminUserId,
    previousStatus,
    outcome,
    { queued, slot },
  );
  return {
    replayed: false,
    bookingId,
    previousStatus,
    refund: outcome,
    stripeRefundId,
    queued,
    slot,
  };
}

/**
 * Emite el refund con su auditoría. `issueBookingRefund` no lanza por errores
 * de Stripe, pero sí si el cliente del SDK no se puede crear (falta la clave).
 * La reserva ya está cancelada: ese caso también va a la cola, y si ni eso se
 * puede grabar, la marca la deja lista para reanudar.
 *
 * @throws IncidentRefundNotEligibleError — `in_progress`, si otra petición con
 *   la misma clave sigue en vuelo.
 */
async function issueWithAudit(
  bookingId: string,
  paymentIntentId: string,
  metadata: Record<string, string>,
  now: Date,
): Promise<IssuedRefund> {
  try {
    return await issueBookingRefund(bookingId, paymentIntentId, {
      now,
      idempotencyKey: incidentRefundIdempotencyKey(bookingId),
      metadata,
      throwOnKeyInUse: true,
    });
  } catch (err) {
    // Dos reanudaciones a la vez: la otra dirá cómo acaba. Sin cola ni avisos.
    if (err instanceof RefundKeyInUseError) {
      console.warn('[checkout/incident-refund] refund already in flight:', bookingId);
      throw new IncidentRefundNotEligibleError('in_progress');
    }
    console.error('[checkout/incident-refund] refund could not be attempted:', bookingId);
    reportCheckoutWarning('Incident refund could not reach Stripe.', bookingId, 'error');
    try {
      await refundRepository.recordFailed(bookingId, now, describeStripeFailure(err));
    } catch {
      console.error('[checkout/incident-refund] failure not recorded:', bookingId);
    }
    return { outcome: 'failed', stripeRefundId: null };
  }
}

/**
 * `issueBookingRefund` no lanza si falla la grabación en la cola. Hay que
 * releerlo para no decirle a soporte que algo está en la cola sin estarlo.
 */
async function isFailureRecorded(bookingId: string): Promise<boolean> {
  try {
    return await incidentRefundRepository.hasRecordedFailure(bookingId);
  } catch {
    return false;
  }
}
