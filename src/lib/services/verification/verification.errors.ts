/**
 * Errores tipados del dominio `verification`.
 *
 * Cada error expone un `code` estable que la capa de transporte (server
 * action, route handler) usa para mapear a status HTTP o copy i18n sin
 * parsear mensajes. Siguen el mismo patrón que `booking.errors`.
 */

export class ProviderNotFoundForVerificationError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';

  constructor(message = 'Proveedor no encontrado en la cola de verificación.') {
    super(message);
    this.name = 'ProviderNotFoundForVerificationError';
  }
}

export class RejectionNotesRequiredError extends Error {
  readonly code = 'REJECTION_NOTES_REQUIRED';

  constructor(message = 'Hace falta motivo para rechazar la verificación.') {
    super(message);
    this.name = 'RejectionNotesRequiredError';
  }
}

export class InvalidVerificationStatusError extends Error {
  readonly code = 'INVALID_STATUS';

  constructor(message = 'Estado de verificación inválido.') {
    super(message);
    this.name = 'InvalidVerificationStatusError';
  }
}
