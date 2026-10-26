'use server';

import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';
import { ZodError } from 'zod';

import { routing, type AppLocale } from '@/i18n/routing';
import { requireRole } from '@/lib/auth/server';
import {
  BookingForCheckoutNotFoundError,
  RefundNotInQueueError,
  retryBookingRefund,
  type RetryRefundOutcome,
} from '@/lib/services/checkout';

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
