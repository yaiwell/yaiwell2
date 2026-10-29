/**
 * Errores tipados de la integración Email (Resend).
 *
 * Permiten al caller (route handler, server action que dispara un mail
 * transaccional) decidir entre reintentar, dejar pasar o avisar al
 * usuario sin parsear mensajes del SDK.
 */

export class EmailConfigError extends Error {
  readonly code = 'EMAIL_NOT_CONFIGURED';
  constructor(message = 'RESEND_API_KEY no está configurado.') {
    super(message);
  }
}

/**
 * Códigos de Resend que indican un fallo pasajero: repetir el mismo envío
 * (con la misma clave de idempotencia) puede salir bien al cabo de unos
 * segundos. El resto (dominio, clave, validación, cuota) no se arregla solo.
 */
const RETRYABLE_PROVIDER_CODES = new Set([
  'rate_limit_exceeded',
  'concurrent_idempotent_requests',
  'application_error',
  'internal_server_error',
]);

export class EmailSendError extends Error {
  readonly code = 'EMAIL_SEND_FAILED';
  /** Mensaje original del SDK (sanitizado, sin payload del email). */
  readonly providerMessage: string;
  /** `true` si el fallo es pasajero y tiene sentido reintentar. */
  readonly retryable: boolean;
  constructor(providerMessage: string, providerCode?: string, statusCode?: number | null) {
    super(`Resend rechazó el envío: ${providerMessage}`);
    this.providerMessage = providerMessage;
    this.retryable =
      (providerCode !== undefined && RETRYABLE_PROVIDER_CODES.has(providerCode)) ||
      (typeof statusCode === 'number' && statusCode >= 500);
  }
}

export class EmailValidationError extends Error {
  readonly code = 'EMAIL_INVALID_INPUT';
  constructor(message: string) {
    super(message);
  }
}
