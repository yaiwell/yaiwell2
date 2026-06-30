/**
 * Errores tipados del dominio `payments`.
 *
 * Cada error expone un `code` estable para que las server actions
 * mapeen a copy i18n sin parsear strings.
 */

export class ProviderForPaymentsNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';

  constructor(message = 'Proveedor no encontrado para pagos.') {
    super(message);
    this.name = 'ProviderForPaymentsNotFoundError';
  }
}

/**
 * El proveedor no tiene cuenta Stripe conectada todavía. La UI debe
 * ofrecer el botón "Conectar con Stripe" para crear una.
 */
export class StripeAccountNotConnectedError extends Error {
  readonly code = 'STRIPE_NOT_CONNECTED';

  constructor(message = 'El proveedor aún no tiene cuenta Stripe conectada.') {
    super(message);
    this.name = 'StripeAccountNotConnectedError';
  }
}

/**
 * Stripe rechazó la operación (error de red, configuración o validación
 * del input desde el lado de Stripe). El mensaje original se preserva
 * en `cause` para Sentry; la UI muestra copy genérico.
 */
export class StripeOperationError extends Error {
  readonly code = 'STRIPE_OPERATION_FAILED';

  constructor(message = 'Stripe rechazó la operación.', cause?: unknown) {
    super(message);
    this.name = 'StripeOperationError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}
