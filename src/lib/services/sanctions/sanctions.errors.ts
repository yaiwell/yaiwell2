/**
 * Errores tipados del dominio de sanciones.
 */

export class SanctionNotFoundError extends Error {
  readonly code = 'SANCTION_NOT_FOUND';

  constructor(message = 'Sanción no encontrada.') {
    super(message);
    this.name = 'SanctionNotFoundError';
  }
}

/**
 * La sanción ya estaba revocada. Se distingue de «no existe» para que
 * soporte entienda por qué no cambió nada (otro admin, o el negocio la
 * deshizo a tiempo).
 */
export class SanctionAlreadyRevokedError extends Error {
  readonly code = 'SANCTION_ALREADY_REVOKED';

  constructor(message = 'La sanción ya estaba revocada.') {
    super(message);
    this.name = 'SanctionAlreadyRevokedError';
  }
}
