import type { CustomerBooking } from '@/lib/fake-data/customer-bookings';

/**
 * Props del listado de reservas del área cliente.
 *
 * Se pasan ya divididos los tres conjuntos para mantener el componente
 * 100% presentacional. La partición se hace en `BookingsList.logic.ts`.
 */
export interface BookingsListProps {
  upcoming: CustomerBooking[];
  past: CustomerBooking[];
  pendingReview: CustomerBooking[];
  /** "Ahora" determinista usado por las cards para decidir si cancelar es posible. */
  now: Date;
}
