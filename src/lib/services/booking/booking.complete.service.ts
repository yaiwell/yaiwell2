/**
 * Cierre de reservas como `completed` (CLAUDE.md §4.bis):
 *  - a mano, por el negocio desde su panel;
 *  - solo, a las 72 h del inicio, si nadie la cerró, se pagara online o
 *    en el local (decidido 2026-10-30: única excepción a «solo el
 *    profesional completa»).
 *
 * Completar es lo que desbloquea la valoración del cliente y, en las
 * reservas en el local, lo que genera la comisión a cobrar al negocio.
 */

import { canCompleteBooking, getAutoCompleteCutoff } from '@/lib/utils/booking-no-show';

import { commitCompletion } from './booking.complete';
import {
  BookingNotConfirmedError,
  BookingNotFoundError,
  BookingNotStartedError,
  UnauthorizedCancellationError,
} from './booking.errors';
import { bookingLifecycleRepository } from './booking.lifecycle.repository';
import { bookingRepository } from './booking.repository';
import type { AutoCompleteSummary, CompleteBookingResult } from './booking.types';

/** Tope por pasada del cron: acota el tiempo de la función serverless. */
export const AUTO_COMPLETE_DEFAULT_LIMIT = 100;

/**
 * Marca una reserva como completada desde el panel del proveedor.
 *
 * Reglas:
 *  - Solo el dueño del Provider asociado puede marcarla.
 *  - Solo `confirmed` → `completed`. No se salta desde `pending` para no
 *    dar por atendida una reserva sin pagar, ni desde `no_show`
 *    (para eso está deshacer).
 *  - Escritura condicional: si el cron, otra pestaña o «no presentado» se
 *    adelantan, 0 filas → `BookingNotConfirmedError`, sin comisión ni
 *    invitación duplicadas.
 *
 * Si era en el local, deja la comisión encolada en la misma transacción
 * y devuelve su id para que el caller llame a `itemizeCommission`.
 *
 * @param bookingId — reserva a completar.
 * @param providerUserId — `User.id` interno del dueño autenticado.
 * @param now — instante del cierre; inyectable para tests.
 * @throws BookingNotFoundError — la reserva no existe.
 * @throws UnauthorizedCancellationError — el usuario no es el dueño
 *   (mismo error que cancelar: la regla de titularidad es la misma).
 * @throws BookingNotConfirmedError — no estaba (o dejó de estar) `confirmed`.
 * @throws BookingNotStartedError — todavía no ha llegado la hora de inicio.
 */
export async function markBookingCompleted(
  bookingId: string,
  providerUserId: string,
  now: Date = new Date(),
): Promise<CompleteBookingResult> {
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) {
    throw new BookingNotFoundError();
  }
  if (booking.provider.userId !== providerUserId) {
    throw new UnauthorizedCancellationError();
  }
  if (booking.status !== 'confirmed') {
    throw new BookingNotConfirmedError();
  }
  // Antes del inicio no se ha prestado nada: completar desbloquearía la
  // valoración y, en el local, generaría comisión.
  if (!canCompleteBooking(booking, now)) {
    throw new BookingNotStartedError();
  }

  const outcome = await commitCompletion(booking, 'confirmed', now);
  if (!outcome) {
    throw new BookingNotConfirmedError();
  }
  return {
    bookingId,
    paymentMode: booking.paymentMode,
    onsiteCommissionChargeId: outcome.onsiteCommissionChargeId,
  };
}

/**
 * Completa las reservas aún `confirmed` (online o en el local) cuyo
 * inicio pasó hace **más** de 72 h. Para el cron diario.
 *
 * Todas desbloquean la invitación a valorar. Solo las del local encolan
 * comisión: en las online ya se retuvo al cobrar (`application_fee`).
 *
 * Una a una, cada una en su transacción y con la misma escritura
 * condicional que el cierre manual: si el negocio marca «no presentado»
 * en la carrera, gana quien escriba primero y el otro no hace nada. Un
 * fallo en una no frena las demás; queda `confirmed` y se reintenta en
 * la siguiente pasada.
 *
 * @param now — instante de referencia del cron.
 * @param limit — máximo de reservas por pasada.
 * @returns ids completados (invitar a valorar), comisiones encoladas
 *   (pasar a `itemizeCommission`) y fallos.
 */
export async function autoCompleteStaleBookings(
  now: Date = new Date(),
  limit: number = AUTO_COMPLETE_DEFAULT_LIMIT,
): Promise<AutoCompleteSummary> {
  const summary: AutoCompleteSummary = {
    completedBookingIds: [],
    commissionChargeIds: [],
    failedBookingIds: [],
  };
  const stale = await bookingLifecycleRepository.findStaleConfirmed(
    getAutoCompleteCutoff(now),
    limit,
  );

  for (const booking of stale) {
    try {
      const outcome = await commitCompletion(booking, 'confirmed', now);
      // 0 filas: alguien la cerró entre la lectura y aquí. Nada que hacer.
      if (!outcome) continue;
      summary.completedBookingIds.push(booking.id);
      if (outcome.onsiteCommissionChargeId) {
        summary.commissionChargeIds.push(outcome.onsiteCommissionChargeId);
      }
    } catch (err) {
      console.error('[booking/auto-complete] failed to complete booking:', booking.id, err);
      summary.failedBookingIds.push(booking.id);
    }
  }
  return summary;
}

/**
 * @deprecated Nombre anterior: desde 2026-10-30 el cierre automático cubre
 * también las reservas online. Usar `autoCompleteStaleBookings`.
 */
export const autoCompleteStaleOnsiteBookings = autoCompleteStaleBookings;
