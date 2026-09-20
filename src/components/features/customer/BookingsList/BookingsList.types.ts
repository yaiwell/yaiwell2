import type { CustomerBookingView } from '@/lib/services/customer-bookings';

/**
 * Props del listado de reservas del área cliente.
 *
 * Se pasan ya divididos los tres conjuntos para mantener el componente
 * 100% presentacional. La partición se hace en `BookingsList.logic.ts`.
 */
export interface BookingsListProps {
  upcoming: CustomerBookingView[];
  past: CustomerBookingView[];
  pendingReview: CustomerBookingView[];
}
