'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';

import {
  BookingNotCancellableError,
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
  isBookingTooSoonError,
} from '@/lib/services/booking';
import {
  OnsitePaymentNotAllowedError,
  ProfessionalNotResolvedError,
  cancelBookingByClientWithRefund,
  createOnsiteBooking,
  getBookingForConfirmation,
  getPaymentOptions,
  type OnsitePaymentBlockReason,
  type PaymentOptions,
} from '@/lib/services/checkout';
import { notifyBookingConfirmed, scheduleNotification } from '@/lib/services/notifications';
import { ensureUserFromClerk } from '@/lib/services/user';

/**
 * Server actions del pago en el local (CLAUDE.md §4.bis, decidido
 * 2026-10-29 y 2026-10-30).
 *
 * Van aparte de `actions.ts` (checkout online) para que ninguno de los
 * dos ficheros pase de las ~250 líneas. Mismo contrato que el checkout:
 * el navegador solo dice qué servicio y a qué hora; precio, comisión y
 * si el pago en el local está permitido los decide el servidor.
 */

/** Códigos de error de la reserva en el local, opacos para la UI. */
export type OnsiteBookingErrorCode =
  | 'UNAUTHENTICATED'
  | 'VALIDATION'
  | 'SERVICE_UNAVAILABLE'
  | 'SLOT_UNAVAILABLE'
  | 'SLOT_TOO_SOON'
  | 'ONSITE_NOT_ALLOWED'
  // La reserva `pending` que había que sustituir ya está pagada: el
  // cliente no debe acabar con dos reservas para la misma hora.
  | 'PENDING_ALREADY_PAID'
  | 'INTERNAL';

/** Resultado serializable de `createOnsiteBookingAction`. */
export type OnsiteBookingActionState =
  | {
      ok: true;
      bookingId: string;
      /** Lo que el cliente pagará en el local (descuento congelado incluido). */
      amountCents: number;
      originalPriceCents: number | null;
      discountPct: number | null;
      slotStartIso: string;
      slotEndIso: string;
    }
  | {
      ok: false;
      code: OnsiteBookingErrorCode;
      /** Solo con `ONSITE_NOT_ALLOWED`: por qué no se puede pagar en el local. */
      reason?: OnsitePaymentBlockReason;
      /** Solo con `reason: 'client_restricted'`: fin del bloqueo (ISO-8601). */
      restrictedUntilIso?: string | null;
    };

/**
 * Entrada de la reserva en el local. Se valida con Zod aquí (el id a
 * sustituir) y en el servicio (servicio, hora y notas).
 */
export interface CreateOnsiteBookingActionInput {
  serviceId: string;
  slotStartIso: string;
  notes?: string;
  /**
   * Reserva `pending` propia que el flujo abrió al ir al pago online
   * antes de cambiar a «pagar en el local». Retiene la franja, así que
   * hay que soltarla antes de crear la nueva.
   */
  replacesPendingBookingId?: string | null;
}

const replaceSchema = z.string().uuid().nullish();

/**
 * Crea una reserva con pago en el local: nace `confirmed`, sin cobro.
 *
 * Si el flujo ya había abierto el pago online, cancela esa reserva
 * `pending` solo después de validar que el local está permitido (y solo
 * si sigue `pending`: una ya pagada no se toca y se devuelve
 * `PENDING_ALREADY_PAID`). El aviso de confirmación al
 * cliente y al negocio sale tras responder.
 *
 * @param input — servicio, hora, notas y, opcionalmente, la `pending` a sustituir.
 */
export async function createOnsiteBookingAction(
  input: CreateOnsiteBookingActionInput,
): Promise<OnsiteBookingActionState> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { ok: false, code: 'UNAUTHENTICATED' };

  const replaces = replaceSchema.safeParse(input?.replacesPendingBookingId);
  if (!replaces.success) return { ok: false, code: 'VALIDATION' };

  try {
    const user = await ensureUserFromClerk(clerkUserId);
    const pendingId = replaces.data;
    // La `pending` se suelta dentro del servicio, solo cuando ya consta que
    // el local está permitido: si no, el cliente conserva su reserva online.
    const booking = await createOnsiteBooking(
      { serviceId: input.serviceId, slotStartIso: input.slotStartIso, notes: input.notes },
      user.id,
      new Date(),
      pendingId ? { releasePending: () => releaseOwnPending(pendingId, user.id) } : {},
    );
    scheduleNotification(() => notifyBookingConfirmed(booking.bookingId));
    revalidatePath('/[locale]/mis-reservas', 'page');
    return {
      ok: true,
      bookingId: booking.bookingId,
      amountCents: booking.amountCents,
      originalPriceCents: booking.originalPriceCents,
      discountPct: booking.discountPct,
      slotStartIso: booking.slotStartIso,
      slotEndIso: booking.slotEndIso,
    };
  } catch (error) {
    return mapOnsiteError(error);
  }
}

/** La `pending` a sustituir ya está pagada: no se toca ni se crea otra. */
class PendingAlreadyPaidError extends Error {
  constructor() {
    super('The pending booking to replace is already paid.');
    this.name = 'PendingAlreadyPaidError';
  }
}

/**
 * Suelta la `pending` propia que retiene la franja.
 *
 * @throws PendingAlreadyPaidError — si ya está pagada (o en otro estado
 *   vivo). Si ya no retenía nada (cancelada, caducada), no hace nada.
 */
async function releaseOwnPending(bookingId: string, clientId: string): Promise<void> {
  // `getBookingForConfirmation` filtra por cliente: una reserva ajena
  // devuelve `null` y no se toca.
  const booking = await getBookingForConfirmation(bookingId, clientId);
  if (!booking || booking.status === 'cancelled' || booking.status === 'refunded') return;
  if (booking.status !== 'pending') throw new PendingAlreadyPaidError();
  try {
    await cancelBookingByClientWithRefund({ bookingId }, clientId);
  } catch (error) {
    // Caducó o se canceló entre la lectura y aquí: la franja ya está libre.
    if (error instanceof BookingNotCancellableError) return;
    throw error;
  }
}

/** Traduce los errores del dominio a códigos de UI. */
function mapOnsiteError(error: unknown): Extract<OnsiteBookingActionState, { ok: false }> {
  if (error instanceof PendingAlreadyPaidError) return { ok: false, code: 'PENDING_ALREADY_PAID' };
  if (error instanceof OnsitePaymentNotAllowedError) {
    return {
      ok: false,
      code: 'ONSITE_NOT_ALLOWED',
      reason: error.reason,
      restrictedUntilIso: error.restrictedUntil?.toISOString() ?? null,
    };
  }
  if (isBookingTooSoonError(error)) return { ok: false, code: 'SLOT_TOO_SOON' };
  if (error instanceof ZodError) return { ok: false, code: 'VALIDATION' };
  if (
    error instanceof ServiceNotFoundError ||
    error instanceof ServicePausedError ||
    error instanceof ProfessionalNotResolvedError
  ) {
    return { ok: false, code: 'SERVICE_UNAVAILABLE' };
  }
  if (error instanceof SlotUnavailableError) return { ok: false, code: 'SLOT_UNAVAILABLE' };
  console.error('[reservar/onsite-actions] error inesperado al reservar en el local:', error);
  return { ok: false, code: 'INTERNAL' };
}

/** Resultado de `getPaymentOptionsAction`; `null` si no se pudo saber. */
export type PaymentOptionsActionState = { ok: true; options: PaymentOptions } | { ok: false };

/**
 * Métodos de pago disponibles para un hueco, para el paso de resumen.
 *
 * Funciona sin sesión (el flujo es público hasta pagar): entonces no se
 * puede saber si el cliente está bloqueado y se comprobará al reservar.
 * Es orientativo: `createOnsiteBookingAction` lo repite todo.
 *
 * @param input — `{ serviceId, slotStartIso }` (validado con Zod en el servicio).
 */
export async function getPaymentOptionsAction(input: unknown): Promise<PaymentOptionsActionState> {
  try {
    const { userId: clerkUserId } = await auth();
    const user = clerkUserId ? await ensureUserFromClerk(clerkUserId) : null;
    const options = await getPaymentOptions(input, user?.id ?? null);
    return { ok: true, options };
  } catch (error) {
    // Un servicio que ya no existe o una entrada rota: la UI se queda con
    // el pago online, que siempre está disponible.
    if (!(error instanceof ZodError)) {
      console.error('[reservar/onsite-actions] error al consultar los métodos de pago:', error);
    }
    return { ok: false };
  }
}
