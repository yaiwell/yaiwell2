/**
 * Ventana de valoración (CLAUDE.md §4.bis).
 *
 * Fichero puro, sin Prisma ni `server-only`: lo usan tanto
 * `createReview` (que rechaza fuera de plazo) como el servicio
 * `customer-bookings` (que decide si ofrecer el CTA «Valorar»). Tener una
 * sola implementación evita que la UI ofrezca valorar algo que el
 * servidor luego rechaza, o al revés.
 */

/**
 * Ventana en días desde `completedAt` durante la que se permite valorar.
 * Configurable a nivel de plataforma; en futuras versiones podría ser
 * por plan de suscripción (ver TODO.md).
 */
export const REVIEW_WINDOW_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Indica si una reserva completada sigue dentro de la ventana de
 * valoración.
 *
 * El límite es inclusivo: justo a los 30 días exactos todavía se puede
 * valorar; un milisegundo después, ya no.
 *
 * @param completedAt — momento en que el profesional marcó la reserva
 *   como finalizada.
 * @param now — instante de referencia (se inyecta para poder testear).
 * @returns `true` si aún se puede valorar.
 */
export function isWithinReviewWindow(completedAt: Date, now: Date): boolean {
  return now.getTime() - completedAt.getTime() <= REVIEW_WINDOW_DAYS * MS_PER_DAY;
}
