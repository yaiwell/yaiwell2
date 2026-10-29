'use server';

import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';
import { ZodError } from 'zod';

import { routing, type AppLocale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import {
  BookingForCheckoutNotFoundError,
  RefundNotDismissableError,
  RefundNotInQueueError,
  dismissBookingRefund,
  dismissBookingRefundSchema,
  retryBookingRefund,
  type RetryRefundOutcome,
} from '@/lib/services/checkout';
import { notifyRefundCompleted, scheduleNotification } from '@/lib/services/notifications';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Códigos de error de `retryRefundAction`.
 *
 * Pequeños y estables: la UI los traduce a copy i18n y nunca recibe el
 * mensaje crudo del servidor (podría llevar ids internos o texto de Stripe).
 */
export type RetryRefundErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'NOT_IN_QUEUE'
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'INTERNAL';

/** Resultado serializable del reintento de un reembolso desde /admin. */
export type RetryRefundActionState =
  | { ok: true; outcome: RetryRefundOutcome }
  | { ok: false; code: RetryRefundErrorCode };

/**
 * Reintenta el reembolso de una reserva de la cola de fallidos.
 *
 * Doble guard: el layout `/admin` ya exige `requireRole(['admin'])`,
 * pero lo repetimos porque una server action se puede invocar con un
 * POST directo sin pasar por el layout. Un no admin recibe `FORBIDDEN`
 * en lugar de la redirección: el botón se dispara dentro de una
 * transición y una navegación inesperada confundiría más que ayudaría.
 *
 * Pulsar dos veces no puede duplicar dinero: el reembolso es íntegro y
 * Stripe rechaza un segundo reembolso sobre un cargo ya devuelto.
 *
 * @param locale — locale activo (para el guard y para revalidar la ruta).
 * @param bookingId — reserva cuyo reembolso se reintenta.
 */
export async function retryRefundAction(
  locale: AppLocale,
  bookingId: string,
): Promise<RetryRefundActionState> {
  // El locale llega del cliente y acaba en `revalidatePath`: no lo
  // usamos para nada hasta comprobar que es uno de los soportados.
  if (!hasLocale(routing.locales, locale)) {
    return { ok: false, code: 'VALIDATION' };
  }

  try {
    await requireRole(['admin'], locale);
  } catch {
    // `requireRole` lanza la redirección interna de Next si la sesión no
    // es admin (o no existe): aquí la convertimos en un rechazo explícito.
    return { ok: false, code: 'FORBIDDEN' };
  }

  let outcome: RetryRefundOutcome;
  try {
    const result = await retryBookingRefund({ bookingId });
    outcome = result.refund;
  } catch (err) {
    return { ok: false, code: mapRetryError(err) };
  }

  // Stripe ha aceptado el reembolso: se lo confirmamos al cliente con el
  // mismo nivel de promesa que el aviso de cancelación (si falla después,
  // vuelve a la cola). Comparte clave con el aviso del webhook.
  if (outcome === 'succeeded') {
    scheduleNotification(() => notifyRefundCompleted(bookingId));
  }

  // Un reintento con éxito saca la reserva de la cola; uno fallido
  // actualiza `refundFailedAt` y el motivo. En ambos casos la lista cambia.
  revalidatePath(`/${locale}/admin/reembolsos`);
  return { ok: true, outcome };
}

/** Traduce los errores tipados del dominio a códigos estables para la UI. */
function mapRetryError(err: unknown): RetryRefundErrorCode {
  if (err instanceof ZodError) return 'VALIDATION';
  if (err instanceof BookingForCheckoutNotFoundError) return 'BOOKING_NOT_FOUND';
  if (err instanceof RefundNotInQueueError) return 'NOT_IN_QUEUE';
  console.error('[admin/reembolsos] retryRefundAction error:', err);
  return 'INTERNAL';
}

/**
 * Códigos de error de `dismissRefundAction`. `INVALID_REASON` va aparte
 * de `VALIDATION` porque es el único que el admin puede corregir en el
 * propio formulario.
 */
export type DismissRefundErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'NOT_IN_QUEUE'
  | 'NOT_DISMISSABLE'
  | 'INVALID_REASON'
  | 'VALIDATION'
  | 'FORBIDDEN'
  | 'INTERNAL';

/** Resultado serializable del descarte de una entrada de la cola. */
export type DismissRefundActionState = { ok: true } | { ok: false; code: DismissRefundErrorCode };

/**
 * Descarta una entrada de la cola de reembolsos con un motivo obligatorio.
 *
 * Para las entradas sin salida (`pi_cancel_failed` sin cobro real). No
 * mueve dinero ni cambia el estado de la reserva: la saca de la cola y
 * deja auditado quién (`User.id` interno del admin), cuándo y por qué.
 * Mismo doble guard de rol que `retryRefundAction`.
 *
 * @param locale — locale activo (para el guard y para revalidar la ruta).
 * @param bookingId — reserva cuya entrada se descarta.
 * @param reason — motivo libre, mínimo 5 caracteres sin contar espacios.
 */
export async function dismissRefundAction(
  locale: AppLocale,
  bookingId: string,
  reason: string,
): Promise<DismissRefundActionState> {
  if (!hasLocale(routing.locales, locale)) {
    return { ok: false, code: 'VALIDATION' };
  }

  let clerkUserId: string;
  try {
    ({ userId: clerkUserId } = await requireRole(['admin'], locale));
  } catch {
    return { ok: false, code: 'FORBIDDEN' };
  }

  // Validamos en el borde, antes de tocar BD: una server action es un
  // endpoint público y el formulario puede saltarse.
  const parsed = dismissBookingRefundSchema.safeParse({ bookingId, reason });
  if (!parsed.success) {
    const reasonIssue = parsed.error.issues.some((issue) => issue.path[0] === 'reason');
    return { ok: false, code: reasonIssue ? 'INVALID_REASON' : 'VALIDATION' };
  }

  try {
    const admin = await ensureUserFromClerk(clerkUserId);
    await dismissBookingRefund(parsed.data, admin.id);
  } catch (err) {
    return { ok: false, code: mapDismissError(err) };
  }

  revalidatePath(`/${locale}/admin/reembolsos`);
  return { ok: true };
}

/** Traduce los errores tipados del descarte a códigos estables para la UI. */
function mapDismissError(err: unknown): DismissRefundErrorCode {
  if (err instanceof ZodError) return 'VALIDATION';
  if (err instanceof BookingForCheckoutNotFoundError) return 'BOOKING_NOT_FOUND';
  if (err instanceof RefundNotInQueueError) return 'NOT_IN_QUEUE';
  if (err instanceof RefundNotDismissableError) return 'NOT_DISMISSABLE';
  console.error('[admin/reembolsos] dismissRefundAction error:', err);
  return 'INTERNAL';
}
