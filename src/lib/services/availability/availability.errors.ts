/**
 * Errores tipados del dominio `availability`.
 *
 * Lanzar clases específicas (en lugar de `new Error('...')`) permite al
 * caller distinguir cada caso sin parsear strings, y también centraliza
 * los códigos que la API expone hacia el frontend.
 */

/**
 * El profesional no existe o está de baja. Lleva el prefijo del dominio
 * para no confundirse con `ProfessionalNotFoundError` de `team`, que
 * cubre el panel del equipo y se mapea distinto.
 */
export class AvailabilityProfessionalNotFoundError extends Error {
  readonly code = 'PROFESSIONAL_NOT_FOUND';

  constructor(message = 'Profesional no encontrado.') {
    super(message);
    this.name = 'AvailabilityProfessionalNotFoundError';
  }
}

/**
 * Lanzado por `getSlotsForService` cuando el `serviceId` no existe,
 * está pausado o soft-deleted. El caller (API route público) lo mapea
 * a 404 sin filtrar el detalle interno.
 */
export class ServiceForAvailabilityNotFoundError extends Error {
  readonly code = 'SERVICE_NOT_FOUND';

  constructor(message = 'El servicio no existe o no admite reservas.') {
    super(message);
    this.name = 'ServiceForAvailabilityNotFoundError';
  }
}

/**
 * El profesional pedido no presta el servicio (no está en
 * `service_professionals`, está de baja o es de otro negocio). La API
 * pública lo mapea a 404, igual que un servicio inexistente.
 */
export class ProfessionalNotForServiceError extends Error {
  readonly code = 'PROFESSIONAL_NOT_FOR_SERVICE';

  constructor(message = 'Ese profesional no presta este servicio.') {
    super(message);
    this.name = 'ProfessionalNotForServiceError';
  }
}

export class InvalidScheduleError extends Error {
  readonly code = 'INVALID_SCHEDULE';

  constructor(
    message = 'El horario del profesional no tiene un formato válido.',
    /**
     * Detalle estructurado de los issues de Zod, para depuración.
     */
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = 'InvalidScheduleError';
  }
}
