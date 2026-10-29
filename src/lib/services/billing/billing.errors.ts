/**
 * Errores tipados del dominio `billing`.
 *
 * Cada error expone un `code` estable para que las server actions y el
 * webhook decidan la respuesta (copy i18n, código HTTP) sin parsear
 * mensajes.
 */

/** El negocio no existe (o está borrado). */
export class BillingProviderNotFoundError extends Error {
  readonly code = 'BILLING_PROVIDER_NOT_FOUND';

  constructor(message = 'Provider not found for billing.') {
    super(message);
    this.name = 'BillingProviderNotFoundError';
  }
}

/**
 * Se pidió contratar un plan que no se vende por Checkout (el Gratis, o
 * un tier desconocido). El paso a Gratis se hace cancelando en el portal.
 */
export class PlanNotPurchasableError extends Error {
  readonly code = 'PLAN_NOT_PURCHASABLE';

  constructor(message = 'This plan cannot be purchased as a subscription.') {
    super(message);
    this.name = 'PlanNotPurchasableError';
  }
}

/**
 * El negocio ya tiene una suscripción viva: los cambios de plan van por
 * el Customer Portal, no por un Checkout nuevo (crearía una segunda
 * suscripción y cobraría dos veces).
 */
export class SubscriptionAlreadyActiveError extends Error {
  readonly code = 'SUBSCRIPTION_ALREADY_ACTIVE';

  constructor(message = 'The provider already has a live subscription.') {
    super(message);
    this.name = 'SubscriptionAlreadyActiveError';
  }
}

/** Se pidió el portal para cambiar o cancelar sin suscripción viva. */
export class SubscriptionNotFoundError extends Error {
  readonly code = 'SUBSCRIPTION_NOT_FOUND';

  constructor(message = 'The provider has no live subscription.') {
    super(message);
    this.name = 'SubscriptionNotFoundError';
  }
}

/**
 * El precio de Stripe no coincide con `Plan.monthlyPriceCents` (o no
 * existe). Preferimos no vender a cobrar una cifra distinta de la que
 * publicamos: se arregla ejecutando `npm run stripe:sync-plans`.
 */
export class PlanPriceMismatchError extends Error {
  readonly code = 'PLAN_PRICE_MISMATCH';

  constructor(
    readonly tier: string,
    message = `Stripe price for plan ${tier} does not match the plans table.`,
  ) {
    super(message);
    this.name = 'PlanPriceMismatchError';
  }
}

/** Falta la fila del tier en la tabla `plans` (entorno sin seed). */
export class BillingPlanNotSeededError extends Error {
  readonly code = 'BILLING_PLAN_NOT_SEEDED';

  constructor(
    readonly tier: string,
    message = `Plan ${tier} is missing from the plans table.`,
  ) {
    super(message);
    this.name = 'BillingPlanNotSeededError';
  }
}

/**
 * La sesión de Checkout no pertenece a este negocio o no es de
 * suscripción. Protege la página de vuelta contra un `session_id` ajeno.
 */
export class CheckoutSessionMismatchError extends Error {
  readonly code = 'CHECKOUT_SESSION_MISMATCH';

  constructor(message = 'Checkout session does not belong to this provider.') {
    super(message);
    this.name = 'CheckoutSessionMismatchError';
  }
}

/**
 * Llegó una segunda suscripción viva para un negocio que ya tiene otra
 * viva. No pisamos ninguna: se avisa a Sentry y soporte cancela (y
 * reembolsa) la que sobre.
 */
export class DuplicateSubscriptionError extends Error {
  readonly code = 'DUPLICATE_SUBSCRIPTION';

  constructor(
    readonly providerId: string,
    readonly keptSubscriptionId: string,
    readonly duplicateSubscriptionId: string,
    message = 'The provider has two live subscriptions.',
  ) {
    super(message);
    this.name = 'DuplicateSubscriptionError';
  }
}

/**
 * Stripe rechazó la operación (red, configuración, validación). El
 * original va en `cause` para Sentry; la UI muestra copy genérico.
 */
export class BillingStripeError extends Error {
  readonly code = 'BILLING_STRIPE_FAILED';

  constructor(message = 'Stripe rejected the billing operation.', cause?: unknown) {
    super(message);
    this.name = 'BillingStripeError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * No existe en Stripe el Tax Rate del IVA (21 % inclusivo, marcado con
 * `metadata.yaiwell`) o no cuadra. No vendemos sin IVA en la factura: se
 * arregla con `npm run stripe:sync-plans`.
 */
export class VatTaxRateNotConfiguredError extends Error {
  readonly code = 'VAT_TAX_RATE_NOT_CONFIGURED';

  constructor(message = 'The VAT tax rate for plans is not configured in Stripe.') {
    super(message);
    this.name = 'VatTaxRateNotConfiguredError';
  }
}

/**
 * Falta en Stripe la configuración del Customer Portal de planes
 * (`metadata.yaiwell`). Se crea con `npm run stripe:sync-plans`; sin ella
 * el portal usaría la configuración por defecto del Dashboard.
 */
export class BillingPortalNotConfiguredError extends Error {
  readonly code = 'BILLING_PORTAL_NOT_CONFIGURED';

  constructor(message = 'The billing portal configuration for plans is missing in Stripe.') {
    super(message);
    this.name = 'BillingPortalNotConfiguredError';
  }
}

/** Motivo por el que no se ofrece el cambio de plan en el portal. */
export type PlanChangeBlockReason = 'past_due' | 'scheduled_change' | 'same_plan';

/**
 * No se permite cambiar de plan ahora: hay un cobro pendiente
 * (`past_due`), ya hay un cambio programado o se pide el mismo plan.
 * Son las mismas reglas que aplica la UI, repetidas en el servidor.
 */
export class PlanChangeNotAllowedError extends Error {
  readonly code = 'PLAN_CHANGE_NOT_ALLOWED';

  constructor(
    readonly reason: PlanChangeBlockReason,
    message = `Plan change not allowed: ${reason}.`,
  ) {
    super(message);
    this.name = 'PlanChangeNotAllowedError';
  }
}

/**
 * La sincronización no pudo escribir un estado coherente tras varios
 * intentos (otra sincronización concurrente cambió la fila). Es
 * transitorio: el webhook responde 500 y Stripe reintenta.
 */
export class SubscriptionSyncConflictError extends Error {
  readonly code = 'SUBSCRIPTION_SYNC_CONFLICT';

  constructor(message = 'Subscription sync kept conflicting with a concurrent sync.') {
    super(message);
    this.name = 'SubscriptionSyncConflictError';
  }
}
