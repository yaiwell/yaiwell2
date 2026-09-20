import type { CustomerBookingView } from '@/lib/services/customer-bookings';

/**
 * Tipos específicos del componente BookingCard.
 *
 * `CustomerBookingView` es la proyección de lectura que expone el
 * service `customer-bookings`. Se importa con `import type` a propósito:
 * ese barrel también exporta la función que toca Prisma, y un import de
 * valor arrastraría el cliente de Postgres al bundle.
 */

/**
 * Variante visual de la card según el contexto donde se renderiza.
 *
 * - `upcoming`: próximas reservas, muestra el aviso de cancelación.
 * - `past`: historial, no muestra acciones de cambio.
 * - `pendingReview`: pasada con reseña pendiente, muestra CTA "Valorar".
 */
export type BookingCardVariant = 'upcoming' | 'past' | 'pendingReview';

export interface BookingCardProps {
  booking: CustomerBookingView;
  variant: BookingCardVariant;
}
