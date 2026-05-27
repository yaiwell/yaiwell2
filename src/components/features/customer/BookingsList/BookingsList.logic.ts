import type { CustomerBooking } from '@/lib/fake-data/customer-bookings';

/**
 * Particiona la lista cruda de reservas en los tres grupos que el
 * área cliente muestra como secciones independientes.
 *
 * Reglas (§4.bis):
 *  - "Valoraciones pendientes": reservas en estado `completed` que aún
 *    no tienen review. Solo se puede valorar tras `completed`.
 *  - "Próximas": reservas activas (`pending` / `confirmed`) cuyo
 *    `startAt` está en el futuro.
 *  - "Historial": el resto (pasadas, canceladas o reembolsadas), y las
 *    completadas que ya tienen review (la sección de valorar está vacía).
 *
 * Devolver los tres arrays ya ordenados deja al render del componente
 * limpio y sin lógica.
 */
export function splitBookings(bookings: CustomerBooking[], now: Date) {
  const upcoming: CustomerBooking[] = [];
  const past: CustomerBooking[] = [];
  const pendingReview: CustomerBooking[] = [];

  for (const booking of bookings) {
    const isActiveStatus = booking.status === 'pending' || booking.status === 'confirmed';
    const isFuture = booking.startAt.getTime() > now.getTime();

    if (isActiveStatus && isFuture) {
      upcoming.push(booking);
      continue;
    }

    if (booking.status === 'completed' && !booking.hasReview) {
      pendingReview.push(booking);
      continue;
    }

    past.push(booking);
  }

  // Próximas: la más cercana primero. Historial y pendientes: lo más
  // reciente primero (mayor `startAt` arriba).
  upcoming.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  past.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  pendingReview.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return { upcoming, past, pendingReview };
}
