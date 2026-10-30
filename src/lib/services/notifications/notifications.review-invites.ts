import 'server-only';

import { reviewInvitesRepository } from './notifications.review-invites.repository';
import { notifyBookingCompleted } from './notifications.service';

/** Pausa entre envíos para no chocar con el límite de Resend (2 por segundo). */
const SEND_PAUSE_MS = 500;

/**
 * Antigüedad máxima de la cita para invitar a valorar tras el cierre
 * automático. Las reservas más viejas que se cierren ahora (las que ya
 * había sin cerrar al activar el cierre a las 72 h) se completan sin
 * correo: una invitación semanas después de la cita confunde más que ayuda,
 * y el cliente puede valorar igual desde «Mis reservas».
 */
export const REVIEW_INVITE_MAX_AGE_DAYS = 7;

/**
 * De las reservas recién completadas, las que merecen invitación: cita
 * hace como mucho `REVIEW_INVITE_MAX_AGE_DAYS` días.
 *
 * @throws si falla la BD (el caller decide; no invitar es lo seguro).
 */
export async function selectReviewInviteCandidates(
  bookingIds: string[],
  now: Date,
): Promise<string[]> {
  const notBefore = new Date(now.getTime() - REVIEW_INVITE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  return reviewInvitesRepository.findStartedSince(bookingIds, notBefore);
}

/** Resumen del envío de invitaciones a valorar. */
export interface ReviewInviteSummary {
  sent: number;
  /** Reservas que se quedaron sin invitación por falta de tiempo. */
  skipped: number;
}

/**
 * Envía en serie la invitación a valorar de las reservas que el cron ha
 * completado solas a las 72 h (§4.bis). En serie y con pausa porque
 * comparten el límite de Resend con los recordatorios.
 *
 * Nunca lanza por un envío (`notifyBookingCompleted` se traga sus
 * fallos). Lo que no cabe antes de `deadline` queda sin invitación: la
 * reserva ya está completada y el cliente puede valorar igual desde
 * «Mis reservas»; queda en el log.
 *
 * @param bookingIds — reservas recién completadas.
 * @param deadline — instante (ms epoch) a partir del cual no se envía más.
 * @param pauseMs — pausa entre envíos; 0 en tests.
 */
export async function sendReviewInvites(
  bookingIds: string[],
  deadline: number,
  pauseMs: number = SEND_PAUSE_MS,
): Promise<ReviewInviteSummary> {
  let sent = 0;
  for (const bookingId of bookingIds) {
    if (Date.now() >= deadline) break;
    if (sent > 0 && pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, pauseMs));
    await notifyBookingCompleted(bookingId);
    sent++;
  }
  const skipped = bookingIds.length - sent;
  if (skipped > 0) {
    console.warn('[notifications] review invites skipped (time budget):', bookingIds.slice(sent));
  }
  return { sent, skipped };
}
