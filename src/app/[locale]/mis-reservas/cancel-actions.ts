'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { hasLocale } from 'next-intl';
import { z, ZodError } from 'zod';

import { routing } from '@/i18n/routing';
import {
  BookingNotCancellableError,
  BookingNotFoundError,
  BookingTooLateToCancelError,
  LastMinuteBookingNotCancellableError,
  UnauthorizedCancellationError,
} from '@/lib/services/booking';
import { cancelBookingByClientWithRefund } from '@/lib/services/checkout';
import {
  notifyBookingCancelledByClient,
  scheduleNotification,
  toCancellationRefundState,
  type CancellationRefundState,
} from '@/lib/services/notifications';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Códigos de error de `cancelMyBookingAction`. Estables y opacos: la UI
 * los traduce a copy i18n y nunca recibe el mensaje crudo del servidor.
 */
export type CancelMyBookingErrorCode =
  | 'FORBIDDEN'
  | 'TOO_LATE'
  | 'LAST_MINUTE'
  | 'NOT_CANCELLABLE'
  | 'VALIDATION'
  | 'INTERNAL';

/**
 * Resultado serializable. Con `ok: true` la reserva **está** cancelada;
 * `refund` dice qué pasa con el dinero (un reembolso que Stripe no
 * aceptó a la primera es `refund_pending`: lo termina soporte, y no es
 * un error que el cliente deba reintentar).
 */
export type CancelMyBookingActionState =
  | { ok: true; refund: CancellationRefundState }
  | { ok: false; code: CancelMyBookingErrorCode };

/** Entrada del borde: la action es un endpoint público, se valida con Zod. */
const cancelMyBookingSchema = z.object({ bookingId: z.string().uuid() });

/**
 * Cancela una reserva del cliente autenticado desde `/mis-reservas`.
 *
 * Flujo:
 *  1. Valida el `locale` (acaba en `revalidatePath`) y la entrada.
 *  2. Exige sesión de Clerk y resuelve el `User.id` interno.
 *  3. Delega en `cancelBookingByClientWithRefund`, que comprueba que la
 *     reserva es de este cliente y aplica las reglas de §4.bis (estado,
 *     última hora, 2 h) antes de tocar dinero.
 *  4. Programa los avisos al cliente y al centro tras responder y
 *     revalida `/mis-reservas` y el calendario del panel (la franja queda
 *     libre y se puede liberar con descuento).
 *
 * @param locale — locale activo de la página.
 * @param input — `{ bookingId }`.
 */
export async function cancelMyBookingAction(
  locale: string,
  input: { bookingId: string },
): Promise<CancelMyBookingActionState> {
  if (!hasLocale(routing.locales, locale)) {
    return { ok: false, code: 'VALIDATION' };
  }

  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false, code: 'FORBIDDEN' };
  }

  const parsed = cancelMyBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION' };
  }
  const { bookingId } = parsed.data;

  let refund: CancellationRefundState;
  let offerReopened: boolean;
  try {
    const user = await ensureUserFromClerk(clerkUserId);
    const result = await cancelBookingByClientWithRefund({ bookingId }, user.id);
    refund = toCancellationRefundState(result.refund, result.paymentUncertain);
    offerReopened = result.offerReopened ?? false;
  } catch (err) {
    return { ok: false, code: mapCancelError(err) };
  }

  // La reserva ya está cancelada pase lo que pase con los correos. El
  // centro recibe la propuesta de liberar la hora con descuento, salvo
  // que su oferta de origen siga activa.
  scheduleNotification(() => notifyBookingCancelledByClient(bookingId, refund, offerReopened));
  revalidatePath(`/${locale}/mis-reservas`);
  revalidatePath('/[locale]/panel/calendario', 'page');
  return { ok: true, refund };
}

/** Traduce los errores tipados del dominio a códigos estables. */
function mapCancelError(err: unknown): CancelMyBookingErrorCode {
  if (err instanceof ZodError) return 'VALIDATION';
  // Reserva inexistente y reserva ajena dan el mismo código: así no se
  // revela a un tercero si un id de reserva existe.
  if (err instanceof BookingNotFoundError || err instanceof UnauthorizedCancellationError) {
    return 'FORBIDDEN';
  }
  if (err instanceof LastMinuteBookingNotCancellableError) return 'LAST_MINUTE';
  if (err instanceof BookingTooLateToCancelError) return 'TOO_LATE';
  if (err instanceof BookingNotCancellableError) return 'NOT_CANCELLABLE';
  console.error('[mis-reservas] cancelMyBookingAction error:', err);
  return 'INTERNAL';
}
