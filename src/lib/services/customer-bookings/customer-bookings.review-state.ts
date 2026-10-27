// Import directo del helper puro, no del barrel `review`: el barrel
// arrastra el repositorio (Prisma) y este cálculo no necesita BD.
import { isWithinReviewWindow } from '@/lib/services/review/review.window';

import type { BookingStatus } from './customer-bookings.types';

/**
 * Datos mínimos de una reserva para decidir qué ofrece la card respecto
 * a la valoración.
 */
interface ReviewStateInput {
  status: BookingStatus;
  completedAt: Date | null;
  hasReview: boolean;
}

/** Estado de valoración de una reserva desde el punto de vista del cliente. */
export interface ReviewState {
  canReview: boolean;
  reviewWindowClosed: boolean;
}

/**
 * Decide si una reserva admite valoración ahora mismo.
 *
 * Replica, sin tocar BD, las mismas condiciones que `createReview`
 * (§4.bis): estado `completed` con `completedAt`, dentro de la ventana
 * de 30 días (`isWithinReviewWindow`, compartida con el service de
 * reseñas) y sin reseña previa. La autoría no se comprueba aquí porque
 * `/mis-reservas` ya filtra por `clientId` en la query.
 *
 * @param booking — estado, fecha de finalización y si ya tiene reseña.
 * @param now — instante de referencia (se inyecta para poder testear).
 * @returns `canReview` para el CTA y `reviewWindowClosed` para el aviso
 *   discreto de plazo vencido.
 */
export function resolveReviewState(booking: ReviewStateInput, now: Date): ReviewState {
  if (booking.status !== 'completed' || !booking.completedAt || booking.hasReview) {
    return { canReview: false, reviewWindowClosed: false };
  }

  const inWindow = isWithinReviewWindow(booking.completedAt, now);
  return { canReview: inWindow, reviewWindowClosed: !inWindow };
}
