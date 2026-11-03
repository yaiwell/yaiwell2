/**
 * Errores tipados del dominio `team`. Las server actions los traducen a
 * códigos opacos para el panel.
 */
import type { BlockingBooking, UnstaffedService } from './team.types';

/** El profesional no existe o no es del negocio de la sesión. */
export class ProfessionalNotFoundError extends Error {
  readonly code = 'PROFESSIONAL_NOT_FOUND';
  constructor(message = 'Professional not found for this provider.') {
    super(message);
    this.name = 'ProfessionalNotFoundError';
  }
}

/**
 * El negocio ya tiene tantos profesionales activos como permite su plan
 * (al crear o al reactivar).
 */
export class PlanProfessionalLimitError extends Error {
  readonly code = 'PLAN_PROFESSIONAL_LIMIT';
  constructor(
    readonly maxProfessionals: number,
    message = 'Professional limit of the current plan reached.',
  ) {
    super(message);
    this.name = 'PlanProfessionalLimitError';
  }
}

/**
 * Baja prohibida: el profesional tiene citas futuras activas. El negocio
 * debe cancelarlas antes (regla de 2 h y devolución, CLAUDE.md §4.bis).
 */
export class ProfessionalHasFutureBookingsError extends Error {
  readonly code = 'PROFESSIONAL_HAS_FUTURE_BOOKINGS';
  constructor(
    readonly bookings: BlockingBooking[],
    message = 'Professional has future active bookings.',
  ) {
    super(message);
    this.name = 'ProfessionalHasFutureBookingsError';
  }
}

/** Baja prohibida: es el último profesional activo del negocio. */
export class LastActiveProfessionalError extends Error {
  readonly code = 'LAST_ACTIVE_PROFESSIONAL';
  constructor(message = 'A provider must keep at least one active professional.') {
    super(message);
    this.name = 'LastActiveProfessionalError';
  }
}

/**
 * El cambio dejaría servicios publicados sin nadie que los preste (al
 * quitar servicios a un profesional o al darlo de baja).
 */
export class ServicesWouldBeUnstaffedError extends Error {
  readonly code = 'SERVICES_WOULD_BE_UNSTAFFED';
  constructor(
    readonly services: UnstaffedService[],
    message = 'Change would leave published services without professionals.',
  ) {
    super(message);
    this.name = 'ServicesWouldBeUnstaffedError';
  }
}

/** Algún servicio elegido no es del negocio o está borrado. */
export class TeamServicesInvalidError extends Error {
  readonly code = 'TEAM_SERVICES_INVALID';
  constructor(message = 'Some services do not belong to this provider.') {
    super(message);
    this.name = 'TeamServicesInvalidError';
  }
}

/** La foto no es una subida del propio negocio en la carpeta del equipo. */
export class ProfessionalPhotoInvalidError extends Error {
  readonly code = 'PROFESSIONAL_PHOTO_INVALID';
  constructor(message = 'Professional photo must be uploaded through the panel.') {
    super(message);
    this.name = 'ProfessionalPhotoInvalidError';
  }
}

/** El negocio de la sesión no existe (borrado entre llamadas). */
export class TeamProviderNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';
  constructor(message = 'Provider not found while managing the team.') {
    super(message);
    this.name = 'TeamProviderNotFoundError';
  }
}

/** Un profesional de baja no se edita: primero hay que reactivarlo. */
export class ProfessionalInactiveError extends Error {
  readonly code = 'PROFESSIONAL_INACTIVE';
  constructor(message = 'Professional is inactive; reactivate it before editing.') {
    super(message);
    this.name = 'ProfessionalInactiveError';
  }
}
