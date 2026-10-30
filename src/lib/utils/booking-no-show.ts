/**
 * Ventanas de «no presentado» y del cierre automático de reservas en el
 * local (CLAUDE.md §4.bis, decidido 2026-10-30).
 *
 * Funciones puras sin dependencias de servidor: las comparten el panel
 * (qué botones enseñar) y los servicios (qué aceptar), para que la UI
 * nunca ofrezca algo que el servidor rechace.
 */

const HOUR_MS = 60 * 60 * 1000;

/**
 * Plazo para marcar «no presentado», contado desde `startAt`.
 *
 * 72 h dan margen a un negocio que no mira el panel el fin de semana, y
 * coinciden con el cierre automático de las reservas en el local: pasado
 * este plazo ya no hay nada que marcar (la reserva se completa sola).
 */
export const NO_SHOW_MARK_WINDOW_MS = 72 * HOUR_MS;

/**
 * Plazo para que el negocio deshaga un «no presentado», contado desde que
 * lo marcó (`noShowAt`). Después solo soporte puede revocar la sanción.
 */
export const NO_SHOW_UNDO_WINDOW_MS = 24 * HOUR_MS;

/**
 * Antigüedad (desde `startAt`) a partir de la cual una reserva aún
 * `confirmed` se completa sola, se pagara online o en el local (decidido
 * 2026-10-30). Es el mismo plazo que el de marcar «no presentado»: o lo
 * marcó el negocio, o se da por prestado.
 */
export const AUTO_COMPLETE_AFTER_MS = NO_SHOW_MARK_WINDOW_MS;

/** Situación de una reserva frente a la acción «No se presentó». */
export type NoShowMarkWindow = 'not_started' | 'open' | 'closed';

/**
 * Dónde cae `now` respecto a la ventana de «no presentado»:
 * `[startAt, startAt + 72 h]`, ambos límites incluidos.
 *
 * Antes del inicio no se puede marcar (el cliente aún puede llegar);
 * a las 72 h justas todavía sí, y el cierre automático empieza solo
 * cuando se supera ese instante (`isAutoCompleteDue`).
 *
 * @param startAt — inicio de la reserva.
 * @param now — instante de referencia.
 */
export function getNoShowMarkWindow(startAt: Date, now: Date): NoShowMarkWindow {
  const elapsed = now.getTime() - startAt.getTime();
  if (elapsed < 0) return 'not_started';
  if (elapsed > NO_SHOW_MARK_WINDOW_MS) return 'closed';
  return 'open';
}

/**
 * Si el negocio puede marcar ahora «no presentado»: reserva `confirmed`
 * y dentro de la ventana de 72 h desde el inicio.
 */
export function canMarkNoShow(booking: { status: string; startAt: Date }, now: Date): boolean {
  return booking.status === 'confirmed' && getNoShowMarkWindow(booking.startAt, now) === 'open';
}

/**
 * Si el negocio puede marcar la reserva como finalizada: `confirmed` y ya
 * empezada (`now >= startAt`). Antes del inicio no se ha prestado nada, y
 * completar desbloquearía la valoración y, en el local, la comisión.
 */
export function canCompleteBooking(booking: { status: string; startAt: Date }, now: Date): boolean {
  return booking.status === 'confirmed' && now.getTime() >= booking.startAt.getTime();
}

/**
 * Si el negocio puede deshacer ahora un «no presentado»: reserva
 * `no_show` marcada hace 24 h o menos (límite incluido).
 */
export function canUndoNoShow(
  booking: { status: string; noShowAt: Date | null },
  now: Date,
): boolean {
  if (booking.status !== 'no_show' || !booking.noShowAt) return false;
  return now.getTime() - booking.noShowAt.getTime() <= NO_SHOW_UNDO_WINDOW_MS;
}

/**
 * Si una reserva que sigue `confirmed` ya debe completarse sola: han
 * pasado **más** de 72 h desde su inicio.
 */
export function isAutoCompleteDue(startAt: Date, now: Date): boolean {
  return now.getTime() - startAt.getTime() > AUTO_COMPLETE_AFTER_MS;
}

/**
 * Corte para la consulta del cron: las reservas con `startAt` anterior a
 * este instante (estrictamente) ya deben completarse solas.
 */
export function getAutoCompleteCutoff(now: Date): Date {
  return new Date(now.getTime() - AUTO_COMPLETE_AFTER_MS);
}
