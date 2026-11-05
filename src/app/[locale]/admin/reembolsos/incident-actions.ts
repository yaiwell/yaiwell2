'use server';

import type { BookingStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';
import { ZodError } from 'zod';

import { routing, type AppLocale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import {
  BookingForCheckoutNotFoundError,
  IncidentRefundConflictError,
  IncidentRefundNotEligibleError,
  getIncidentRefundPreview,
  issueIncidentRefundSchema,
  previewIncidentRefundSchema,
  refundBookingForCentreIncident,
  resumeCentreIncidentRefund,
  type IncidentRefundEligibility,
  type IncidentRefundIneligibleReason,
  type IncidentRefundResult,
  type IncidentSlotState,
} from '@/lib/services/checkout';
import {
  notifyCentreIncidentRefund,
  scheduleNotification,
  toCancellationRefundState,
} from '@/lib/services/notifications';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Server actions del reembolso por incidencia del centro. Mismo doble guard
 * que `actions.ts`: una server action se puede invocar con un POST directo
 * sin pasar por el layout de /admin.
 */

/** Resumen serializable que pinta el formulario; el formato lo pone la UI. */
export interface IncidentRefundPreviewView {
  bookingId: string;
  providerName: string;
  serviceName: string;
  startAtIso: string;
  priceCents: number;
  status: BookingStatus;
  eligibility: IncidentRefundEligibility;
  canResendNotices: boolean;
}

/** Códigos de error de la búsqueda. */
export type IncidentPreviewErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'INTERNAL';

/** Resultado de buscar una reserva. */
export type IncidentPreviewActionState =
  | { ok: true; preview: IncidentRefundPreviewView }
  | { ok: false; code: IncidentPreviewErrorCode };

/**
 * Códigos de error del reembolso. `INVALID_NOTE` va aparte porque el admin
 * lo corrige en el propio formulario, y `NOT_ELIGIBLE` lleva su motivo.
 */
export type IncidentRefundErrorCode =
  | IncidentPreviewErrorCode
  | 'INVALID_NOTE'
  | 'CONFLICT'
  | 'NOT_ELIGIBLE';

/**
 * Desenlace del dinero que ve soporte. `failed` queda en la cola;
 * `failed_unrecorded` no se pudo grabar en ella y hay que reanudarlo.
 */
export type IncidentRefundActionOutcome =
  | 'issued'
  | 'already_refunded'
  | 'failed'
  | 'failed_unrecorded';

/** Resultado del reembolso. */
export type IncidentRefundActionState =
  | { ok: true; outcome: IncidentRefundActionOutcome; slot: IncidentSlotState }
  | { ok: false; code: 'NOT_ELIGIBLE'; reason: IncidentRefundIneligibleReason }
  | { ok: false; code: 'INVALID_NOTE' }
  | { ok: false; code: Exclude<IncidentRefundErrorCode, 'NOT_ELIGIBLE' | 'INVALID_NOTE'> };

/**
 * Busca una reserva y dice si admite el reembolso. No escribe nada; sí consulta
 * el pago en Stripe si en BD la reserva es elegible.
 *
 * @param locale — locale activo (para el guard).
 * @param bookingId — id pegado por soporte.
 */
export async function previewIncidentRefundAction(
  locale: AppLocale,
  bookingId: string,
): Promise<IncidentPreviewActionState> {
  if (!hasLocale(routing.locales, locale)) return { ok: false, code: 'VALIDATION' };

  try {
    await requireRole(['admin'], locale);
  } catch {
    return { ok: false, code: 'FORBIDDEN' };
  }

  const parsed = previewIncidentRefundSchema.safeParse({ bookingId });
  if (!parsed.success) return { ok: false, code: 'VALIDATION' };

  try {
    const preview = await getIncidentRefundPreview(parsed.data);
    return {
      ok: true,
      preview: {
        bookingId: preview.bookingId,
        providerName: preview.providerName,
        serviceName: preview.serviceName,
        startAtIso: preview.startAt.toISOString(),
        priceCents: preview.priceCents,
        status: preview.status,
        eligibility: preview.eligibility,
        canResendNotices: preview.canResendNotices,
      },
    };
  } catch (err) {
    if (err instanceof BookingForCheckoutNotFoundError) {
      return { ok: false, code: 'BOOKING_NOT_FOUND' };
    }
    console.error('[admin/reembolsos] previewIncidentRefundAction error:', err);
    return { ok: false, code: 'INTERNAL' };
  }
}

/**
 * Cancela la reserva y devuelve el 100 % por una incidencia del centro.
 *
 * Si llega una segunda petición con la primera en vuelo, no responde el
 * resultado de aquella: responde que otra acción cambió la reserva (o que el
 * reembolso está en curso) y soporte vuelve a buscarla. Si la primera ya
 * terminó y el dinero consta devuelto, responde `already_refunded` y repite los
 * avisos con las mismas claves, sin duplicarlos. En ningún caso llega a Stripe.
 *
 * @param locale — locale activo (para el guard y para revalidar la ruta).
 * @param bookingId — reserva a reembolsar.
 * @param note — motivo; queda en BD y en la `metadata` del Refund de Stripe.
 */
export async function issueIncidentRefundAction(
  locale: AppLocale,
  bookingId: string,
  note: string,
): Promise<IncidentRefundActionState> {
  if (!hasLocale(routing.locales, locale)) return { ok: false, code: 'VALIDATION' };

  let clerkUserId: string;
  try {
    ({ userId: clerkUserId } = await requireRole(['admin'], locale));
  } catch {
    return { ok: false, code: 'FORBIDDEN' };
  }

  const parsed = issueIncidentRefundSchema.safeParse({ bookingId, note });
  if (!parsed.success) {
    const noteIssue = parsed.error.issues.some((issue) => issue.path[0] === 'note');
    return { ok: false, code: noteIssue ? 'INVALID_NOTE' : 'VALIDATION' };
  }

  try {
    const admin = await ensureUserFromClerk(clerkUserId);
    const result = await refundBookingForCentreIncident(parsed.data, admin.id);
    return finish(result, locale);
  } catch (err) {
    return mapIncidentRefundError(err);
  }
}

/**
 * Completa un reembolso por incidencia que se quedó a medias, con el motivo
 * que se escribió al cancelar. Avisa a cliente y centro: la caída pudo ocurrir
 * antes de los correos, y las claves por reserva evitan repetirlos.
 *
 * @param locale — locale activo (para el guard y para revalidar la ruta).
 * @param bookingId — reserva a completar.
 */
export async function resumeIncidentRefundAction(
  locale: AppLocale,
  bookingId: string,
): Promise<IncidentRefundActionState> {
  if (!hasLocale(routing.locales, locale)) return { ok: false, code: 'VALIDATION' };

  let clerkUserId: string;
  try {
    ({ userId: clerkUserId } = await requireRole(['admin'], locale));
  } catch {
    return { ok: false, code: 'FORBIDDEN' };
  }

  const parsed = previewIncidentRefundSchema.safeParse({ bookingId });
  if (!parsed.success) return { ok: false, code: 'VALIDATION' };

  try {
    const admin = await ensureUserFromClerk(clerkUserId);
    const result = await resumeCentreIncidentRefund(parsed.data, admin.id);
    return finish(result, locale);
  } catch (err) {
    return mapIncidentRefundError(err);
  }
}

/**
 * Avisa solo si esta llamada ha actuado, también si Stripe ha fallado: la
 * reserva ya está cancelada y el cliente tiene que saberlo.
 */
function finish(result: IncidentRefundResult, locale: AppLocale): IncidentRefundActionState {
  // Un fallo añade la reserva a la cola que se pinta encima del formulario.
  revalidatePath(`/${locale}/admin/reembolsos`);
  if (result.replayed) {
    const { bookingId, notice } = result;
    if (!notice) return { ok: true, outcome: result.refund, slot: 'not_applicable' };
    // El dinero ya volvió, pero el proceso pudo caerse antes de los correos.
    scheduleNotification(() =>
      notifyCentreIncidentRefund(bookingId, {
        refund: toCancellationRefundState(result.refund),
        previousStatus: notice.previousStatus,
        slot: notice.slot,
      }),
    );
    return { ok: true, outcome: result.refund, slot: notice.slot };
  }

  const { bookingId, previousStatus, slot } = result;
  const refund = toCancellationRefundState(result.refund);
  scheduleNotification(() =>
    notifyCentreIncidentRefund(bookingId, { refund, previousStatus, slot }),
  );
  const outcome =
    result.refund === 'failed' && !result.queued ? 'failed_unrecorded' : result.refund;
  return { ok: true, outcome, slot };
}

/** Traduce los errores tipados del dominio a códigos estables para la UI. */
function mapIncidentRefundError(err: unknown): IncidentRefundActionState {
  if (err instanceof ZodError) return { ok: false, code: 'VALIDATION' };
  if (err instanceof BookingForCheckoutNotFoundError) {
    return { ok: false, code: 'BOOKING_NOT_FOUND' };
  }
  if (err instanceof IncidentRefundNotEligibleError) {
    return { ok: false, code: 'NOT_ELIGIBLE', reason: err.reason };
  }
  if (err instanceof IncidentRefundConflictError) return { ok: false, code: 'CONFLICT' };
  console.error('[admin/reembolsos] incident refund action error:', err);
  return { ok: false, code: 'INTERNAL' };
}
