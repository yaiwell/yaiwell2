import type { CustomerBooking } from '@/lib/fake-data/customer-bookings';

/**
 * Tipos específicos del componente BookingCard.
 *
 * Los tipos de dominio (CustomerBooking) viven en `fake-data` por
 * ahora; cuando exista repositorio real se moverán a `/types/domain`.
 */

/**
 * Variante visual de la card según el contexto donde se renderiza.
 *
 * - `upcoming`: próximas reservas, muestra acciones (cancelar / detalle).
 * - `past`: historial, no muestra acciones de cambio.
 * - `pendingReview`: pasada con reseña pendiente, muestra CTA "Valorar".
 */
export type BookingCardVariant = 'upcoming' | 'past' | 'pendingReview';

export interface BookingCardProps {
  booking: CustomerBooking;
  variant: BookingCardVariant;
  /**
   * "Ahora" de referencia para decidir si la cancelación es posible.
   * Se inyecta desde el servidor para mantener determinismo en la demo.
   */
  now: Date;
}
