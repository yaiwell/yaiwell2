import 'server-only';

import { availabilityRepository } from '@/lib/services/availability';
import { ServiceNotFoundError } from '@/lib/services/booking';

import { ProfessionalNotResolvedError } from './checkout.errors';

/** Servicio, negocio y profesional (o «cualquiera») sobre los que se reserva. */
export interface BookingTarget {
  serviceId: string;
  providerId: string;
  /**
   * Profesional elegido por el cliente, o `null` para «cualquiera
   * disponible»: entonces lo asigna `createBooking` dentro de la
   * transacción (CLAUDE.md §4.bis «Equipo»).
   */
  professionalId: string | null;
}

/**
 * Resuelve el servicio (activo, no borrado) y valida el profesional
 * pedido, igual para el pago online y en el local.
 *
 * Los profesionales salen de `service_professionals` (migración 9h),
 * igual que en el motor de disponibilidad: el slot que se mostró y el
 * que se reserva se calculan sobre el mismo equipo.
 *
 * @param serviceId — servicio a reservar.
 * @param professionalId — profesional elegido; omitido = «cualquiera».
 * @throws ServiceNotFoundError — servicio inexistente, pausado o borrado.
 * @throws ProfessionalNotResolvedError — nadie activo presta el servicio,
 *   o el profesional pedido no lo presta.
 */
export async function resolveBookingTarget(
  serviceId: string,
  professionalId?: string,
): Promise<BookingTarget> {
  const service = await availabilityRepository.findServiceForAvailability(serviceId);
  if (!service) {
    throw new ServiceNotFoundError();
  }
  if (service.professionalIds.length === 0) {
    throw new ProfessionalNotResolvedError();
  }
  if (professionalId && !service.professionalIds.includes(professionalId)) {
    throw new ProfessionalNotResolvedError();
  }
  return { serviceId, providerId: service.providerId, professionalId: professionalId ?? null };
}
