'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';

import type { AppLocale } from '@/i18n/routing';
import { requireCurrentProvider } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  BookingNotCancellableError,
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingTooLateToCancelError,
  UnauthorizedCancellationError,
  markBookingCompleted,
} from '@/lib/services/booking';
import { cancelBookingByProviderWithRefund } from '@/lib/services/checkout';
import type { RefundOutcome } from '@/lib/services/checkout';

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
        | 'NOT_CANCELLABLE'
        | 'REFUND_FAILED'
        | 'INTERNAL';
    };

/** Variante de fallo del estado, para tipar el traductor de errores. */
type CalendarActionError = Extract<CalendarActionState, { ok: false }>;

/**
 * Resuelve el `User.id` interno dueño del Provider autenticado.
 *
 * Los services del dominio booking autorizan comparando contra
 * `provider.userId` (no contra el `clerkId`), así que traducimos aquí
 * una sola vez en lugar de en cada action.
 *
 * @returns el `User.id`, o `null` si no hay provider resoluble.
 */
async function resolveProviderUserId(locale: AppLocale): Promise<string | null> {
  let providerId: string;
  try {
    const provider = await requireCurrentProvider(locale);
    providerId = provider.id;
  } catch {
    // `requireCurrentProvider` redirige cuando no hay provider; este
    // catch cubre el caso defensivo de no llegar a redirect (tests,
    // entornos sin Clerk montado, etc.).
    return null;
  }

  const providerRow = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { userId: true },
  });

  return providerRow?.userId ?? null;
}

/**
 * Traduce los errores tipados del dominio booking a códigos opacos.
 *
 * Se comparte entre ambas actions porque las dos delegan en services
 * que lanzan exactamente la misma familia de errores.
 */
function toActionCode(err: unknown): CalendarActionError {
  if (err instanceof ZodError) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  if (err instanceof BookingNotFoundError) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  if (err instanceof UnauthorizedCancellationError) {
    return { ok: false, code: 'FORBIDDEN' };
  }
  if (err instanceof BookingTooLateToCancelError) {
    return { ok: false, code: 'TOO_LATE' };
  }
  if (err instanceof BookingNotConfirmedError) {
    return { ok: false, code: 'NOT_CONFIRMED' };
  }
  if (err instanceof BookingNotCancellableError) {
    return { ok: false, code: 'NOT_CANCELLABLE' };
  }
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

  try {
    await markBookingCompleted(bookingId, providerUserId);
  } catch (err) {
    const state = toActionCode(err);
    // Solo lo inesperado va al log: los errores de regla de negocio
    // son respuestas legítimas, no incidencias que revisar.
    if (state.code === 'INTERNAL') {
      console.error('[panel/calendario] completeBookingAction error:', err);
    }
    return state;
  }

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
  try {
    const result = await cancelBookingByProviderWithRefund({ bookingId }, providerUserId);
    refund = result.refund;
  } catch (err) {
    const state = toActionCode(err);
    if (state.code === 'INTERNAL') {
      console.error('[panel/calendario] cancelBookingAction error:', err);
    }
    return state;
  }

  // La reserva ya está cancelada pase lo que pase con el reembolso.
  revalidatePath(`/${locale}/panel/calendario`);

  if (refund === 'failed') {
    return { ok: false, code: 'REFUND_FAILED' };
  }
  return { ok: true };
}
