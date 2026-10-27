/**
 * Props de la valoración propia mostrada en la card de reserva.
 */
export interface ExistingReviewProps {
  bookingId: string;
  /** Puntuación 1-5 ya guardada. */
  rating: number;
  text: string;
}
