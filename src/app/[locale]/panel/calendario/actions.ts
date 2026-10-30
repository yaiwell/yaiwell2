'use server';

import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';

import type { AppLocale } from '@/i18n/routing';
import {
  BookingNotCancellableError,
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingNotStartedError,
  BookingTooLateToCancelError,
  UnauthorizedCancellationError,
  markBookingCompleted,
  markBookingNoShow,
  undoBookingNoShow,
} from '@/lib/services/booking';
import { scheduleCommissionItemization } from '@/lib/services/billing';
import { cancelBookingByProviderWithRefund } from '@/lib/services/checkout';
import type { RefundOutcome } from '@/lib/services/checkout';
import {
  notifyBookingCancelledByProvider,
  notifyBookingCompleted,
  notifyBookingNoShow,
  notifyNoShowUndone,
  scheduleNotification,
  toCancellationRefundState,
  type CancellationRefundState,
} from '@/lib/services/notifications';

import { toNoShowActionCode, type NoShowActionState } from './no-show-errors';
import { resolveProviderOwner } from './provider-owner';

/**
 * Resultado serializable de las server actions del calendario.
 *
 * Códigos pequeños y opacos: el cliente elige el copy localizado y no
 * se filtran detalles internos (mensajes Prisma, ids de Stripe…).
 *
 * `REFUND_FAILED` es un caso especial: la cancelación **sí** se aplicó
 * y el cliente ya no tiene la cita, pero el reembolso no salió. Viaja
 * como error para que la UI lo cuente, no para que el proveedor crea
 * que debe reintentar la cancelación.
 */
export type CalendarActionState =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'NOT_FOUND'
        | 'FORBIDDEN'
        | 'TOO_LATE'
        | 'NOT_CONFIRMED'
        | 'NOT_STARTED'
        | 'NOT_CANCELLABLE'
        | 'REFUND_FAILED'
        | 'INTERNAL';
    };

/** Variante de fallo del estado, para tipar el traductor de errores. */
type CalendarActionError = Extract<CalendarActionState, { ok: false }>;

/**
 * `User.id` interno dueño del Provider autenticado, o `null`.
 *
 * La resolución vive en `provider-owner.ts` porque también la usan las
 * actions de huecos liberados (`slot-offers.actions.ts`).
 */
async function resolveProviderUserId(locale: AppLocale): Promise<string | null> {
  return (await resolveProviderOwner(locale))?.userId ?? null;
}

/**
 * Traduce los errores tipados del dominio booking a códigos opacos.
 *
 * Se comparte entre ambas actions porque las dos delegan en services
 * que lanzan exactamente la misma familia de errores.
 */
function toActionCode(err: unknown): CalendarActionError {
  if (err instanceof ZodError || err instanceof BookingNotFoundError) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  if (err instanceof UnauthorizedCancellationError) return { ok: false, code: 'FORBIDDEN' };
  if (err instanceof BookingTooLateToCancelError) return { ok: false, code: 'TOO_LATE' };
  if (err instanceof BookingNotConfirmedError) return { ok: false, code: 'NOT_CONFIRMED' };
  if (err instanceof BookingNotCancellableError) return { ok: false, code: 'NOT_CANCELLABLE' };
  if (err instanceof BookingNotStartedError) return { ok: false, code: 'NOT_STARTED' };
  return { ok: false, code: 'INTERNAL' };
}

/**
 * Marca una reserva como finalizada desde el panel del proveedor.
 *
 * Es el único camino por el que una reserva llega a `completed`, y por
 * tanto el que desbloquea el CTA "Valorar" del cliente (§4.bis de
 * CLAUDE.md). El service solo admite la transición `confirmed` →
 * `completed`; saltar desde `pending` devuelve `NOT_CONFIRMED`.
 */
export async function completeBookingAction(
  locale: AppLocale,
  bookingId: string,
): Promise<CalendarActionState> {
  const providerUserId = await resolveProviderUserId(locale);
  if (!providerUserId) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  let commissionChargeId: string | null;
  try {
    const result = await markBookingCompleted(bookingId, providerUserId);
    commissionChargeId = result.onsiteCommissionChargeId;
  } catch (err) {
    const state = toActionCode(err);
    // Solo lo inesperado va al log: los errores de regla de negocio
    // son respuestas legítimas, no incidencias que revisar.
    if (state.code === 'INTERNAL') {
      console.error('[panel/calendario] completeBookingAction error:', err);
    }
    return state;
  }

  // La invitación a valorar sale tras responder; si falla, la cita sigue finalizada.
  scheduleNotification(() => notifyBookingCompleted(bookingId));
  // En el local, la comisión pasa a Stripe tras responder (`null` si era online).
  scheduleCommissionItemization(commissionChargeId);
  revalidatePath(`/${locale}/panel/calendario`);
  return { ok: true };
}

/**
 * Cancela una reserva desde el panel y dispara el reembolso íntegro.
 *
 * Delegamos en `cancelBookingByProviderWithRefund`, que aplica primero
 * las reglas del dominio (titularidad, estado cancelable, ventana de
 * 2 h) y después intenta el reembolso en Stripe.
 *
 * Ese service **no lanza** si Stripe falla: devuelve `refund: 'failed'`
 * con la reserva ya cancelada. Lo traducimos a `REFUND_FAILED` y aun
 * así revalidamos, porque el cambio de estado es real y la lista debe
 * reflejarlo; lo pendiente es solo el dinero, y de eso se ocupa
 * soporte.
 */
export async function cancelBookingAction(
  locale: AppLocale,
  bookingId: string,
): Promise<CalendarActionState> {
  const providerUserId = await resolveProviderUserId(locale);
  if (!providerUserId) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  let refund: RefundOutcome;
  let refundState: CancellationRefundState;
  try {
    const result = await cancelBookingByProviderWithRefund({ bookingId }, providerUserId);
    refund = result.refund;
    refundState = toCancellationRefundState(result.refund, result.paymentUncertain);
  } catch (err) {
    const state = toActionCode(err);
    if (state.code === 'INTERNAL') {
      console.error('[panel/calendario] cancelBookingAction error:', err);
    }
    return state;
  }

  // La reserva ya está cancelada pase lo que pase con el reembolso.
  scheduleNotification(() => notifyBookingCancelledByProvider(bookingId, refundState));
  revalidatePath(`/${locale}/panel/calendario`);

  if (refund === 'failed') {
    return { ok: false, code: 'REFUND_FAILED' };
  }
  return { ok: true };
}

/** Id de reserva del borde: una server action es un endpoint público. */
const bookingIdSchema = z.string().uuid();

/**
 * Marca «No se presentó» desde el panel (§4.bis, decidido 2026-10-29).
 *
 * Solo entre el inicio de la cita y 72 h después (lo comprueba el
 * dominio). Pagada online: sin devolución ni sanción. En el local: 1
 * sanción al cliente y sin comisión. El aviso al cliente sale tras
 * responder y solo si el cambio se aplicó ahora (un doble clic no
 * duplica correo).
 */
export async function markNoShowAction(
  locale: AppLocale,
  bookingId: string,
): Promise<NoShowActionState> {
  const providerUserId = await resolveProviderUserId(locale);
  if (!providerUserId) return { ok: false, code: 'FORBIDDEN' };
  if (!bookingIdSchema.safeParse(bookingId).success) return { ok: false, code: 'NOT_FOUND' };

  try {
    const result = await markBookingNoShow(bookingId, providerUserId);
    if (result.changed) {
      const notice = {
        sanctionApplied: result.sanctionApplied,
        sanctionsInWindow: result.eligibility?.sanctionsInWindow ?? 0,
        restrictedUntil: result.eligibility?.restrictedUntil ?? null,
      };
      scheduleNotification(() => notifyBookingNoShow(bookingId, notice));
    }
  } catch (err) {
    return toNoShowActionCode(err, 'markNoShowAction');
  }
  revalidatePath(`/${locale}/panel/calendario`);
  return { ok: true };
}

/**
 * Deshace «No se presentó» (solo durante 24 h desde que se marcó; después,
 * soporte). Revoca la sanción si la había y avisa al cliente de que la
 * marca (y la sanción) quedan retiradas. Si ya pasaron 72 h desde la
 * cita, el dominio la completa en el acto: entonces se invita a valorar y,
 * si era en el local, se pasa la comisión a Stripe.
 */
export async function undoNoShowAction(
  locale: AppLocale,
  bookingId: string,
): Promise<NoShowActionState> {
  const providerUserId = await resolveProviderUserId(locale);
  if (!providerUserId) return { ok: false, code: 'FORBIDDEN' };
  if (!bookingIdSchema.safeParse(bookingId).success) return { ok: false, code: 'NOT_FOUND' };

  try {
    const undoneAt = new Date();
    const result = await undoBookingNoShow(bookingId, providerUserId, undoneAt);
    // El aviso de no presentado sale en segundos: el cliente ya lo tiene.
    scheduleNotification(() => notifyNoShowUndone(bookingId, result.sanctionRevoked, undoneAt));
    if (result.status === 'completed') {
      scheduleNotification(() => notifyBookingCompleted(bookingId));
      scheduleCommissionItemization(result.onsiteCommissionChargeId);
    }
  } catch (err) {
    return toNoShowActionCode(err, 'undoNoShowAction');
  }
  revalidatePath(`/${locale}/panel/calendario`);
  return { ok: true };
}
