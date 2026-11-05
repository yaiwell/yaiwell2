import 'server-only';

import { pickLocalized } from '@/lib/i18n';
import type { LocalizedText } from '@/types/domain';

import { BookingForCheckoutNotFoundError } from './checkout.errors';
import { readIncidentSlotState } from './checkout.incident-refund.effects';
import { evaluateIncidentRefundWithStripe } from './checkout.incident-refund.eligibility';
import {
  IncidentRefundConflictError,
  IncidentRefundNotEligibleError,
} from './checkout.incident-refund.errors';
import { incidentMetadataFromColumns } from './checkout.incident-refund.metadata';
import {
  incidentRefundRepository,
  type IncidentRefundRow,
} from './checkout.incident-refund.repository';
import { settleIncidentRefund } from './checkout.incident-refund.settle';
import type {
  IncidentRefundFromStatus,
  IncidentRefundPreview,
  IncidentRefundResult,
} from './checkout.incident-refund.types';
import { issueIncidentRefundSchema, previewIncidentRefundSchema } from './checkout.validation';

/**
 * Reembolso por incidencia del centro (/admin/reembolsos).
 *
 * Es la excepción de fuerza mayor de §4.bis: el centro no puede atender y
 * ya no puede cancelar por su cuenta (menos de 2 h, o cita ya empezada o
 * pasada), así que soporte cancela y devuelve el 100 %. La autorización
 * de admin vive en la server action, como en la cola de reembolsos.
 *
 * **Por qué `completed` también pasa por `cancelled`.** `cancelled` es en
 * este dominio «muerta y con el dinero aún sin confirmar», y `refunded` es
 * «Stripe confirma que volvió» (`charge.refunded`, que acepta `cancelled`
 * como origen y rellena `refundedAt`). Si la dejáramos `completed`, o la
 * pasáramos a `refunded` antes de tiempo, un fallo de Stripe quedaría sin
 * salida: el reintento y el descarte de la cola solo admiten `cancelled`.
 * El estado final es `refunded` en ambos casos; `completedAt` se conserva
 * y las reseñas publicadas siguen contando porque no se tocan.
 *
 * Comisión y sanciones: solo existen en reservas en el local
 * (`OnsiteCommissionCharge`, `ClientSanction`), que aquí no son elegibles.
 * La comisión online vuelve con el propio refund (`refund_application_fee`).
 */

/**
 * Resumen de una reserva para que soporte decida. Consulta el pago en Stripe
 * si en BD la reserva es elegible.
 *
 * @param input — payload crudo `{ bookingId }` (validado con Zod).
 * @param options.now — reloj de referencia; inyectable en tests.
 * @throws BookingForCheckoutNotFoundError — la reserva no existe.
 */
export async function getIncidentRefundPreview(
  input: unknown,
  options: { now?: Date } = {},
): Promise<IncidentRefundPreview> {
  const { bookingId } = previewIncidentRefundSchema.parse(input);
  const row = await loadRow(bookingId);
  const eligibility = await evaluateIncidentRefundWithStripe(row, options.now ?? new Date());

  return {
    bookingId: row.id,
    providerName: row.provider.businessName,
    serviceName: pickLocalized(row.service.name as LocalizedText, 'es'),
    startAt: row.startAt,
    priceCents: row.priceCents,
    status: row.status,
    eligibility,
    canResendNotices: !eligibility.eligible && isReplayWithNotices(row, eligibility.reason),
  };
}

/**
 * Cancela la reserva y devuelve el 100 % por una incidencia del centro.
 *
 * Vale a cualquier hora: es justo lo que no puede hacer el centro por su
 * cuenta. **Orden BD → Stripe, sin rollback**, como en
 * `cancelBookingByProviderWithRefund`. Si Stripe falla, la reserva queda
 * `cancelled` y en la cola de /admin; si ni eso se puede grabar, se reanuda
 * con `resumeCentreIncidentRefund`.
 *
 * La escritura condicional deja pasar una sola ejecución. Una segunda con la
 * primera en vuelo ve la reserva ya cambiada y no llega a Stripe.
 *
 * @param input — payload crudo `{ bookingId, note }` (validado con Zod).
 * @param adminUserId — `User.id` interno del admin, para la auditoría.
 * @param options.now — instante de la cancelación; inyectable en tests.
 * @throws BookingForCheckoutNotFoundError — la reserva no existe.
 * @throws IncidentRefundNotEligibleError — ver `reason`; incluye el pago en
 *   el local, donde no hay cobro que devolver.
 * @throws IncidentRefundConflictError — otra acción cambió la reserva.
 */
export async function refundBookingForCentreIncident(
  input: unknown,
  adminUserId: string,
  options: { now?: Date } = {},
): Promise<IncidentRefundResult> {
  const { bookingId, note } = issueIncidentRefundSchema.parse(input);
  const now = options.now ?? new Date();
  const row = await loadRow(bookingId);

  const eligibility = await evaluateIncidentRefundWithStripe(row, now);
  if (!eligibility.eligible) return replayOrThrow(row, eligibility.reason, now);
  // Sin completar: se resuelve con su propia acción, sin pisar el motivo.
  if (eligibility.mode === 'resume') throw new IncidentRefundConflictError();

  const previousStatus = row.status;
  if (previousStatus !== 'confirmed' && previousStatus !== 'completed') {
    throw new IncidentRefundNotEligibleError('status');
  }

  const cancelled = await incidentRefundRepository.cancelForIncident(bookingId, previousStatus, {
    at: now,
    by: adminUserId,
    note,
  });
  if (!cancelled) throw new IncidentRefundConflictError();

  const metadata = { reason: 'centre_incident', note, adminUserId };
  return settleIncidentRefund(row, previousStatus, metadata, adminUserId, now);
}

/**
 * Completa un reembolso que se quedó a medias: la reserva ya está cancelada
 * por incidencia pero no consta ni refund ni fallo (caída entre BD y Stripe,
 * o un fallo que no se pudo grabar). Misma clave y misma `metadata` que el
 * primer intento: si aquel llegó a Stripe, Stripe devuelve el mismo Refund.
 *
 * @param input — payload crudo `{ bookingId }` (validado con Zod).
 * @param adminUserId — `User.id` del admin que lo completa.
 * @param options.now — reloj de referencia; inyectable en tests.
 * @throws BookingForCheckoutNotFoundError | IncidentRefundNotEligibleError
 *   | IncidentRefundConflictError — esta última si la reserva sigue viva.
 */
export async function resumeCentreIncidentRefund(
  input: unknown,
  adminUserId: string,
  options: { now?: Date } = {},
): Promise<IncidentRefundResult> {
  const { bookingId } = previewIncidentRefundSchema.parse(input);
  const now = options.now ?? new Date();
  const row = await loadRow(bookingId);

  const eligibility = await evaluateIncidentRefundWithStripe(row, now);
  if (!eligibility.eligible) return replayOrThrow(row, eligibility.reason, now);
  if (eligibility.mode !== 'resume') throw new IncidentRefundConflictError();

  const previousStatus = previousStatusOf(row);
  const metadata = incidentMetadataFromColumns(row) ?? { reason: 'centre_incident' };
  return settleIncidentRefund(row, previousStatus, metadata, adminUserId, now);
}

async function loadRow(bookingId: string): Promise<IncidentRefundRow> {
  const row = await incidentRefundRepository.findRow(bookingId);
  if (!row) throw new BookingForCheckoutNotFoundError('La reserva no existe.');
  return row;
}

/** ¿Ya devuelta, y marcada por incidencia? Entonces se pueden repetir sus avisos. */
function isReplayWithNotices(
  row: IncidentRefundRow,
  reason: IncidentRefundNotEligibleError['reason'],
): boolean {
  return reason === 'already_refunded' && row.incidentRefundAt !== null;
}

/**
 * Ya devuelta es un éxito sin mover dinero; cualquier otro motivo es un error.
 * Si lleva la marca de incidencia se devuelve lo necesario para repetir los
 * avisos: el proceso pudo caerse tras el éxito de Stripe y antes de los correos,
 * y Resend no duplica mientras recuerde sus claves (24 h).
 */
async function replayOrThrow(
  row: IncidentRefundRow,
  reason: IncidentRefundNotEligibleError['reason'],
  now: Date,
): Promise<IncidentRefundResult> {
  if (reason !== 'already_refunded') throw new IncidentRefundNotEligibleError(reason);
  const notice = isReplayWithNotices(row, reason)
    ? { previousStatus: previousStatusOf(row), slot: await readIncidentSlotState(row, now) }
    : null;
  return {
    replayed: true,
    bookingId: row.id,
    refund: 'already_refunded',
    stripeRefundId: row.stripeRefundId,
    notice,
  };
}

/** `completedAt` se conserva al cancelar: es lo que distingue el origen. */
function previousStatusOf(row: IncidentRefundRow): IncidentRefundFromStatus {
  return row.completedAt ? 'completed' : 'confirmed';
}
