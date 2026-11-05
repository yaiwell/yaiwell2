import 'server-only';

import type { IncidentRefundIneligibleReason } from './checkout.incident-refund.errors';
import type { IncidentRefundRow } from './checkout.incident-refund.repository';
import type {
  IncidentRefundEligibility,
  IncidentRefundFromStatus,
} from './checkout.incident-refund.types';
import { reportCheckoutWarning, retrievePaymentIntentWithCharge } from './checkout.payment-intent';
import { describeStripeCode } from './checkout.refund.issue';

/**
 * Quién admite el reembolso por incidencia. Lo usan el resumen y la ejecución,
 * para que lo que ve soporte y lo que se aplica no diverjan.
 */

/**
 * Margen antes de ofrecer reanudar un reembolso sin completar. El SDK de Stripe
 * puede tardar minutos entre su timeout y sus reintentos: reanudar con la misma
 * clave mientras la primera petición sigue en vuelo daría
 * `idempotency_key_in_use`, y eso metería en la cola un reembolso correcto.
 */
export const INCIDENT_REFUND_RESUME_GRACE_MS = 5 * 60_000;

const FROM_STATUSES: ReadonlySet<string> = new Set<IncidentRefundFromStatus>([
  'confirmed',
  'completed',
]);

function ineligible(reason: IncidentRefundIneligibleReason): IncidentRefundEligibility {
  return { eligible: false, reason };
}

/**
 * Decide con lo que hay en BD. Pura.
 *
 * El orden importa: un cargo con el refund fallido no es «ya devuelto» aunque
 * tenga `stripeRefundId`, y decirlo le ocultaría a soporte que ese dinero sigue
 * pendiente en la cola.
 *
 * @param now — reloj de referencia para el margen de reanudación.
 */
export function evaluateIncidentRefund(
  row: Pick<
    IncidentRefundRow,
    | 'status'
    | 'paymentMode'
    | 'stripePaymentIntentId'
    | 'stripeRefundId'
    | 'refundedAt'
    | 'refundFailedAt'
    | 'refundDismissedAt'
    | 'incidentRefundAt'
  >,
  now: Date,
): IncidentRefundEligibility {
  if (row.paymentMode !== 'online') return ineligible('onsite');
  if (row.status === 'refunded' || row.refundedAt) return ineligible('already_refunded');
  if (row.stripeRefundId && !row.refundFailedAt) return ineligible('already_refunded');
  const failureOpen = row.refundFailedAt !== null && row.refundDismissedAt === null;
  if (failureOpen && (row.status === 'cancelled' || row.stripeRefundId)) {
    return ineligible('in_queue');
  }
  if (row.incidentRefundAt && row.status === 'cancelled' && !row.refundFailedAt) {
    if (!row.stripePaymentIntentId) return ineligible('no_payment');
    const age = now.getTime() - row.incidentRefundAt.getTime();
    if (age < INCIDENT_REFUND_RESUME_GRACE_MS) return ineligible('in_progress');
    return { eligible: true, mode: 'resume' };
  }
  if (!FROM_STATUSES.has(row.status) || row.stripeRefundId) return ineligible('status');
  if (!row.stripePaymentIntentId) return ineligible('no_payment');
  return { eligible: true, mode: 'new' };
}

/**
 * Comprueba en Stripe lo que la BD no sabe. Un reembolso parcial o un
 * contracargo hechos fuera de la app harían falso el «te devolvemos el 100 %».
 * Un cargo ya devuelto entero no bloquea: Stripe responde
 * `charge_already_refunded` al emitir y la reserva se cierra igual.
 *
 * Nunca lanza: si Stripe no responde devuelve `stripe_unavailable`, y ante la
 * duda no se finge que la reserva es elegible.
 *
 * @returns el motivo de bloqueo, o `null` si se puede seguir.
 */
export async function checkIncidentPaymentInStripe(
  bookingId: string,
  paymentIntentId: string,
): Promise<IncidentRefundIneligibleReason | null> {
  try {
    const { intent, charge } = await retrievePaymentIntentWithCharge(paymentIntentId);
    if (intent.status !== 'succeeded' || !charge) return 'no_payment';
    if (charge.disputed) return 'disputed';
    if (charge.amount_refunded > 0 && charge.amount_refunded < charge.amount) {
      return 'partially_refunded';
    }
    return null;
  } catch (err) {
    const code = describeStripeCode(err);
    console.error('[checkout/incident-refund] payment check failed:', bookingId, code);
    // Sin código de Stripe no fue Stripe: lo normal es que falte la clave.
    reportCheckoutWarning(
      `Incident refund payment check failed (${code}).`,
      bookingId,
      code === 'unknown_error' ? 'error' : 'warning',
    );
    return 'stripe_unavailable';
  }
}

/** Decisión completa del resumen y de la ejecución: BD y, si pasa, Stripe. */
export async function evaluateIncidentRefundWithStripe(
  row: IncidentRefundRow,
  now: Date,
): Promise<IncidentRefundEligibility> {
  const fromDb = evaluateIncidentRefund(row, now);
  if (!fromDb.eligible || !row.stripePaymentIntentId) return fromDb;
  const blocked = await checkIncidentPaymentInStripe(row.id, row.stripePaymentIntentId);
  return blocked ? ineligible(blocked) : fromDb;
}
