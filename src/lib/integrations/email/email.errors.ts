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

export class EmailSendError extends Error {
  readonly code = 'EMAIL_SEND_FAILED';
  /** Mensaje original del SDK (sanitizado, sin payload del email). */
  readonly providerMessage: string;
  constructor(providerMessage: string) {
    super(`Resend rechazó el envío: ${providerMessage}`);
    this.providerMessage = providerMessage;
  }
}

export class EmailValidationError extends Error {
  readonly code = 'EMAIL_INVALID_INPUT';
  constructor(message: string) {
    super(message);
  }
}
