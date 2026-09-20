import 'server-only';

import type { LocalizedText } from '@/types/domain';

import { customerBookingsRepository } from './customer-bookings.repository';
import type { CustomerBookingView } from './customer-bookings.types';

/**
 * Recupera todas las reservas de un cliente listas para renderizar.
 *
 * El filtrado por `clientId` ocurre en la query, no al mapear: es la
 * única garantía de que un cliente jamás vea la reserva de otro, y no
 * puede quedar a expensas de un `filter` que alguien borre luego.
 *
 * El orden que devuelve el repositorio (`startAt` descendente) es solo
 * un orden estable de partida; la partición en próximas / pendientes de
 * valorar / historial reordena cada grupo por su cuenta.
 *
 * @param clientId — `User.id` del cliente autenticado.
 * @returns las reservas del cliente, sin ninguna de otro.
 */
export async function getCustomerBookings(clientId: string): Promise<CustomerBookingView[]> {
  const records = await customerBookingsRepository.findByClientId(clientId);

  return records.map((record) => ({
    id: record.id,
    status: record.status,
    startAt: record.startAt,
    endAt: record.endAt,
    priceCents: record.priceCents,
    serviceId: record.serviceId,
    // `Service.name` es `Json` en Prisma; el schema garantiza la forma
    // `LocalizedText`, pero el tipo generado es `JsonValue` y necesita
    // el casteo explícito (mismo patrón que `panel-calendar.service`).
    serviceName: record.service.name as unknown as LocalizedText,
    professionalName: record.professional.name,
    providerId: record.provider.id,
    providerName: record.provider.businessName,
    providerSlug: record.provider.slug,
    providerAddress: record.provider.address,
    // Un proveedor sin fotos devuelve `[]`: lo normalizamos a `null`
    // para que la card pueda decidir no renderizar el `<img>`.
    providerPhoto: record.provider.photos[0] ?? null,
    hasReview: record.review !== null,
    // Prisma devuelve `null` para las columnas opcionales vacías; la
    // vista usa `undefined` para poder hacer `booking.notes ? ...`.
    notes: record.notes ?? undefined,
  }));
}
