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

/**
 * La forma jurídica recibida no es `individual` ni `company`. Se valida
 * también en el service para que ningún caller pueda saltarse la action.
 */
export class InvalidConnectBusinessTypeError extends Error {
  readonly code = 'INVALID_BUSINESS_TYPE';

  constructor(message = 'Tipo de cuenta Stripe no válido.') {
    super(message);
    this.name = 'InvalidConnectBusinessTypeError';
  }
}

/**
 * La cuenta conectada no es Express (p. ej. la cuenta Custom de pruebas
 * de Studio Aura). Ni el AccountLink de este flujo ni el login link del
 * dashboard Express aplican; el alta se gestiona por soporte.
 */
export class StripeAccountNotExpressError extends Error {
  readonly code = 'STRIPE_NOT_EXPRESS';

  constructor(message = 'La cuenta Stripe del proveedor no es Express.') {
    super(message);
    this.name = 'StripeAccountNotExpressError';
  }
}

/**
 * El dashboard Express solo está disponible cuando el proveedor ya ha
 * enviado sus datos a Stripe (`details_submitted`).
 */
export class StripeDashboardUnavailableError extends Error {
  readonly code = 'STRIPE_DASHBOARD_UNAVAILABLE';

  constructor(message = 'El dashboard de Stripe aún no está disponible para esta cuenta.') {
    super(message);
    this.name = 'StripeDashboardUnavailableError';
  }
}

/**
 * El proveedor eligió una forma jurídica distinta de la de la cuenta que
 * ya existe. No continuamos con la cuenta antigua en silencio: Stripe no
 * deja cambiar `business_type` tras el primer AccountLink y el cambio
 * se hace por soporte. `existingType` permite a la UI explicarlo.
 */
export class StripeAccountAlreadyConnectedError extends Error {
  readonly code = 'STRIPE_ALREADY_CONNECTED';

  constructor(
    readonly existingType: 'individual' | 'company' | 'other',
    message = 'El proveedor ya tiene una cuenta Stripe de otro tipo.',
  ) {
    super(message);
    this.name = 'StripeAccountAlreadyConnectedError';
  }
}
