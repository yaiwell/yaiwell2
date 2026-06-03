/**
 * Errores tipados del dominio `availability`.
 *
 * Lanzar clases específicas (en lugar de `new Error('...')`) permite al
 * caller distinguir cada caso sin parsear strings, y también centraliza
 * los códigos que la API expone hacia el frontend.
 */

export class ProfessionalNotFoundError extends Error {
  readonly code = 'PROFESSIONAL_NOT_FOUND';

  constructor(message = 'Profesional no encontrado.') {
    super(message);
    this.name = 'ProfessionalNotFoundError';
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
