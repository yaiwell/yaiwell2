/**
 * «No presentado» (CLAUDE.md §4.bis, decidido 2026-10-29 y 2026-10-30).
 *
 *  - Lo marca el negocio desde su panel, desde la hora de inicio hasta
 *    72 h después.
 *  - Pagada online: ni devolución ni sanción (el negocio se queda el
 *    cobro y Yaiwell su comisión ya retenida).
 *  - En el local: 1 sanción al cliente y **sin comisión** (el negocio no
 *    cobró nada).
 *  - El negocio puede deshacerlo durante 24 h; después solo soporte
 *    (`revokeSanction`).
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { isExclusionViolation } from '@/lib/db/prisma-errors';
import { getClientOnsiteEligibility, sanctionsRepository } from '@/lib/services/sanctions';
import {
  NO_SHOW_UNDO_WINDOW_MS,
  getNoShowMarkWindow,
  isAutoCompleteDue,
} from '@/lib/utils/booking-no-show';

import { commitCompletion } from './booking.complete';
import {
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingNotNoShowError,
  BookingNotStartedError,
  NoShowUndoWindowClosedError,
  NoShowWindowClosedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';
import { bookingLifecycleRepository } from './booking.lifecycle.repository';
import { bookingRepository } from './booking.repository';
import type { NoShowResult, UndoNoShowResult } from './booking.types';

/** Motivo que queda en la sanción cuando la revoca el propio negocio. */
const UNDO_REVOKE_REASON = 'undo_by_provider';

/** Restricción de BD contra dos `confirmed` solapadas (migración 9d). */
const OVERLAP_CONSTRAINT = 'bookings_no_overlap_confirmed';

/** Carga la reserva y comprueba que es del negocio autenticado. */
async function loadOwnedBooking(bookingId: string, providerUserId: string) {
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) throw new BookingNotFoundError();
  if (booking.provider.userId !== providerUserId) throw new UnauthorizedCancellationError();
  return booking;
}

/**
 * Marca una reserva como «no presentado».
 *
 * Idempotente frente al doble clic: si ya estaba `no_show` devuelve
 * `changed: false` sin tocar nada (ni sanción ni aviso nuevos).
 *
 * Reserva y sanción cambian en la misma transacción. La reserva se
 * escribe condicionada a `confirmed`: si el cron la completó (o el
 * cliente la canceló) en la carrera, 0 filas y no se sanciona.
 *
 * @param bookingId — reserva a marcar.
 * @param providerUserId — `User.id` interno del dueño autenticado.
 * @param now — instante de referencia; inyectable para tests.
 * @throws BookingNotFoundError | UnauthorizedCancellationError
 * @throws BookingNotConfirmedError — no está `confirmed` (ni ya `no_show`).
 * @throws BookingNotStartedError — aún no es la hora de inicio.
 * @throws NoShowWindowClosedError — han pasado más de 72 h del inicio.
 */
export async function markBookingNoShow(
  bookingId: string,
  providerUserId: string,
  now: Date = new Date(),
): Promise<NoShowResult> {
  const booking = await loadOwnedBooking(bookingId, providerUserId);
  const base = { bookingId, clientId: booking.clientId, paymentMode: booking.paymentMode };
  const unchanged: NoShowResult = {
    ...base,
    changed: false,
    sanctionApplied: false,
    eligibility: null,
  };

  if (booking.status === 'no_show') return unchanged;
  if (booking.status !== 'confirmed') throw new BookingNotConfirmedError();

  const window = getNoShowMarkWindow(booking.startAt, now);
  if (window === 'not_started') throw new BookingNotStartedError();
  if (window === 'closed') throw new NoShowWindowClosedError();

  const outcome = await prisma.$transaction(async (tx) => {
    const changed = await bookingLifecycleRepository.markNoShow(bookingId, now, providerUserId, tx);
    if (changed === 0) return null;
    if (booking.paymentMode !== 'onsite') return { sanctionApplied: false };
    const sanctionApplied = await sanctionsRepository.activateNoShowSanction(
      { userId: booking.clientId, bookingId, occurredAt: booking.startAt },
      tx,
    );
    return { sanctionApplied };
  });

  if (!outcome) {
    // Otro camino escribió entre la lectura y aquí.
    const current = await bookingLifecycleRepository.findStatus(bookingId);
    if (current?.status === 'no_show') return unchanged;
    throw new BookingNotConfirmedError();
  }

  // El aviso al cliente cuenta «n de 3» y, si salta, hasta cuándo solo
  // online: lo leemos ya con la sanción confirmada en BD.
  const eligibility = outcome.sanctionApplied
    ? await getClientOnsiteEligibility(booking.clientId, now)
    : null;
  return {
    ...base,
    changed: true,
    sanctionApplied: outcome.sanctionApplied,
    eligibility: eligibility && {
      sanctionsInWindow: eligibility.sanctionsInWindow,
      restrictedUntil: eligibility.restrictedUntil,
    },
  };
}

/**
 * Deshace un «no presentado» (solo el negocio y solo durante 24 h desde
 * que lo marcó). Revoca la sanción, si la había, en la misma transacción.
 *
 *  - Dentro de las 72 h del inicio: vuelve a `confirmed`, pendiente de
 *    que el negocio la cierre (o del cierre automático).
 *  - Pasadas las 72 h: se completa en el acto (comisión si era en el
 *    local); dejarla `confirmed` solo esperaría al cron.
 *
 * Escritura condicional a `no_show`: si otro clic ya lo deshizo, 0 filas
 * → `BookingNotNoShowError` (la UI solo tiene que refrescar).
 *
 * @throws BookingNotFoundError | UnauthorizedCancellationError
 * @throws BookingNotNoShowError — la reserva no está (o dejó de estar) marcada.
 * @throws NoShowUndoWindowClosedError — pasaron más de 24 h.
 * @throws SlotUnavailableError — la franja se volvió a vender (23P01).
 */
export async function undoBookingNoShow(
  bookingId: string,
  providerUserId: string,
  now: Date = new Date(),
): Promise<UndoNoShowResult> {
  const booking = await loadOwnedBooking(bookingId, providerUserId);
  if (booking.status !== 'no_show' || !booking.noShowAt) throw new BookingNotNoShowError();
  if (now.getTime() - booking.noShowAt.getTime() > NO_SHOW_UNDO_WINDOW_MS) {
    throw new NoShowUndoWindowClosedError();
  }

  const revocation = {
    revokedAt: now,
    revokedBy: providerUserId,
    revokeReason: UNDO_REVOKE_REASON,
  };
  let sanctionRevoked = false;
  const revokeSanction = async (tx: Prisma.TransactionClient) => {
    sanctionRevoked = (await sanctionsRepository.revokeByBooking(bookingId, revocation, tx)) > 0;
  };

  if (isAutoCompleteDue(booking.startAt, now)) {
    const outcome = await commitCompletion(booking, 'no_show', now, revokeSanction);
    if (!outcome) throw new BookingNotNoShowError();
    return {
      bookingId,
      status: 'completed',
      sanctionRevoked,
      onsiteCommissionChargeId: outcome.onsiteCommissionChargeId,
    };
  }

  let reverted: boolean;
  try {
    reverted = await prisma.$transaction(async (tx) => {
      const changed = await bookingLifecycleRepository.revertNoShow(bookingId, tx);
      if (changed === 0) return false;
      await revokeSanction(tx);
      return true;
    });
  } catch (err) {
    if (isExclusionViolation(err, OVERLAP_CONSTRAINT)) throw new SlotUnavailableError();
    throw err;
  }
  if (!reverted) throw new BookingNotNoShowError();
  return { bookingId, status: 'confirmed', sanctionRevoked, onsiteCommissionChargeId: null };
}
