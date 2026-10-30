import 'server-only';

import { availabilityRepository } from '@/lib/services/availability';
import { ServiceNotFoundError } from '@/lib/services/booking';

import { ProfessionalNotResolvedError } from './checkout.errors';

/** Servicio y profesional concretos sobre los que se reserva. */
export interface BookingTarget {
  serviceId: string;
  providerId: string;
  professionalId: string;
}

/**
 * Resuelve el servicio (activo, no borrado) y el profesional que lo
 * presta, igual para el pago online y en el local.
 *
 * Mismo fallback que el motor de availability: si el servicio no tiene
 * profesional asignado (caso del autónomo), cae al primero activo del
 * proveedor. Así el slot que se mostró y el que se reserva salen del
 * mismo profesional.
 *
 * @throws ServiceNotFoundError — servicio inexistente, pausado o borrado.
 * @throws ProfessionalNotResolvedError — proveedor sin profesionales activos.
 */
export async function resolveBookingTarget(serviceId: string): Promise<BookingTarget> {
  const service = await availabilityRepository.findServiceForAvailability(serviceId);
  if (!service) {
    throw new ServiceNotFoundError();
  }
  const professionalId =
    service.professionalId ??
    (await availabilityRepository.findFirstProfessionalIdForProvider(service.providerId));
  if (!professionalId) {
    throw new ProfessionalNotResolvedError();
  }
  return { serviceId, providerId: service.providerId, professionalId };
}
