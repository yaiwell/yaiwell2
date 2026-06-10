/**
 * Errores tipados del helper de resolución `userId → providerId`.
 */

/**
 * El usuario autenticado tiene rol `provider` pero todavía no tiene
 * un Provider asociado en BD. Pasa entre el sign-up y la finalización
 * del wizard de onboarding (#57). El caller debe redirigir a
 * `/onboarding` en lugar de pintar el panel vacío.
 */
export class ProviderNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';
  constructor(message = 'El usuario provider aún no tiene Provider asociado.') {
    super(message);
  }
}
