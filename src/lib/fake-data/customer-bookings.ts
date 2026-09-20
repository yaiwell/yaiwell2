import type { BookingStatus, CustomerBookingView } from '@/lib/services/customer-bookings';
import type { Service } from '@/types/domain';

import { fakeProviders } from './providers';
import { fakeServices } from './services';

/**
 * Fixtures de reservas del cliente.
 *
 * `/mis-reservas` consulta BD desde 2026-09-20. Este módulo se mantiene
 * solo como fixture para tests y demos, y por eso **no** define ya sus
 * propios tipos: reexporta los del service real para que cualquier
 * cambio de forma en `CustomerBookingView` rompa aquí en typecheck en
 * lugar de dejar los fixtures mintiendo sobre el shape real.
 */
export type { CustomerBookingView };

/** Alias histórico del tipo de vista. Preferir `CustomerBookingView`. */
export type CustomerBooking = CustomerBookingView;

/** Alias histórico del estado. La fuente de verdad es el enum Prisma. */
export type CustomerBookingStatus = BookingStatus;

/**
 * Punto temporal fijo usado como "ahora" para generar bookings
 * deterministas. Usamos una fecha estable (en lugar de `Date.now()`)
 * para que la demo sea reproducible y no cambien las cards al refrescar.
 *
 * Coincide con `today` declarado en `availability.ts`.
 */
const REFERENCE_NOW = new Date('2026-05-27T10:00:00+02:00');

/**
 * Helper interno para construir un booking dada la diferencia en horas
 * frente a `REFERENCE_NOW` y un identificador de servicio del catálogo.
 *
 * El offset positivo significa "en el futuro" y negativo "en el pasado".
 */
function buildBooking(args: {
  id: string;
  serviceId: string;
  professionalName: string;
  offsetHours: number;
  status: CustomerBookingStatus;
  hasReview?: boolean;
  notes?: string;
}): CustomerBooking {
  const service = fakeServices.find((s: Service) => s.id === args.serviceId);
  if (!service) {
    throw new Error(`Fake service ${args.serviceId} not found`);
  }
  const provider = fakeProviders.find((p) => p.id === service.providerId);
  if (!provider) {
    throw new Error(`Fake provider ${service.providerId} not found`);
  }

  const startAt = new Date(REFERENCE_NOW.getTime() + args.offsetHours * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);

  return {
    id: args.id,
    status: args.status,
    startAt,
    endAt,
    priceCents: service.priceCents,
    serviceId: service.id,
    serviceName: service.name,
    professionalName: args.professionalName,
    providerId: provider.id,
    providerName: provider.name,
    providerSlug: provider.slug,
    providerAddress: provider.address,
    providerPhoto: provider.photos[0] ?? null,
    hasReview: args.hasReview ?? false,
    notes: args.notes,
  };
}

/**
 * Listado fijo de reservas del cliente para la demo.
 *
 * Cubre intencionadamente todos los estados y los casos límite del
 * umbral de 2h para cancelación (§4.bis):
 *  - Una reserva a +1h (no cancelable).
 *  - Una reserva a +1h59m aprox (no cancelable).
 *  - Una reserva a +3h (cancelable).
 *  - Reservas pasadas en distintos estados, incluidas las que tienen
 *    review pendiente y las que ya están reseñadas.
 */
export const fakeCustomerBookings: CustomerBooking[] = [
  // ---------- Próximas ----------
  buildBooking({
    id: 'bkg-01',
    serviceId: 'svc-01',
    professionalName: 'Marta Vidal',
    offsetHours: 1,
    status: 'confirmed',
    notes: 'Llego 5 minutos antes para el lavado.',
  }),
  buildBooking({
    id: 'bkg-02',
    serviceId: 'svc-07',
    professionalName: 'Andrés López',
    // 1h 50m: por debajo del umbral de 2h, debe bloquearse la cancelación.
    offsetHours: 1.83,
    status: 'confirmed',
  }),
  buildBooking({
    id: 'bkg-03',
    serviceId: 'svc-18',
    professionalName: 'Eva Martínez',
    offsetHours: 3,
    status: 'confirmed',
  }),
  buildBooking({
    id: 'bkg-04',
    serviceId: 'svc-15',
    professionalName: 'Carlos Romero',
    offsetHours: 26,
    status: 'pending',
    notes: 'Llamar al llegar para abrir la entrada.',
  }),
  buildBooking({
    id: 'bkg-05',
    serviceId: 'svc-16',
    professionalName: 'Núria Bosch',
    offsetHours: 72,
    status: 'confirmed',
  }),

  // ---------- Pasadas: completadas con reseña pendiente ----------
  buildBooking({
    id: 'bkg-06',
    serviceId: 'svc-03',
    professionalName: 'Marta Vidal',
    offsetHours: -48,
    status: 'completed',
    hasReview: false,
  }),
  buildBooking({
    id: 'bkg-07',
    serviceId: 'svc-21',
    professionalName: 'Eva Martínez',
    offsetHours: -120,
    status: 'completed',
    hasReview: false,
  }),

  // ---------- Pasadas: completadas y ya reseñadas ----------
  buildBooking({
    id: 'bkg-08',
    serviceId: 'svc-02',
    professionalName: 'Pere Solé',
    offsetHours: -240,
    status: 'completed',
    hasReview: true,
  }),
  buildBooking({
    id: 'bkg-09',
    serviceId: 'svc-19',
    professionalName: 'Laura Costa',
    offsetHours: -360,
    status: 'completed',
    hasReview: true,
  }),

  // ---------- Pasadas: canceladas y reembolsadas ----------
  buildBooking({
    id: 'bkg-10',
    serviceId: 'svc-04',
    professionalName: 'Marta Vidal',
    offsetHours: -72,
    status: 'cancelled',
  }),
  buildBooking({
    id: 'bkg-11',
    serviceId: 'svc-17',
    professionalName: 'Núria Bosch',
    offsetHours: -96,
    status: 'refunded',
  }),
  buildBooking({
    id: 'bkg-12',
    serviceId: 'svc-20',
    professionalName: 'Laura Costa',
    offsetHours: -480,
    status: 'refunded',
  }),
];

/**
 * Devuelve la fecha de referencia usada para generar los bookings.
 *
 * Exportada para que la lógica de cancelación y los tests puedan
 * compartir el mismo "ahora" determinista que se usó al construir
 * los datos.
 */
export function getBookingsReferenceNow(): Date {
  return REFERENCE_NOW;
}
