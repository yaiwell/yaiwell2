/**
 * API pública del módulo `billing` (planes de negocio con Stripe Billing).
 *
 * **NO client-safe**: los services importan el SDK de Stripe y Prisma.
 * Solo callers server (server actions, route handlers, páginas del
 * panel). Los Client Components pueden importar de aquí únicamente con
 * `import type`, que se borra al compilar.
 */

export { ensureBillingCustomer } from './billing.customer';
export { resolvePriceForTier, tierFromPrice } from './billing.prices';
export { createPlanCheckoutSession, confirmCheckoutSession } from './billing.checkout';
export { createBillingPortalSession } from './billing.portal';
export { resolveVatTaxRate } from './billing.tax';
export { resolvePortalConfiguration } from './billing.portal-config';
export { syncSubscription } from './billing.sync';
export { getProviderBillingSummary } from './billing.status';
export { handleBillingEvent, isBillingEvent, BILLING_EVENTS } from './billing.webhook.service';
export {
  PAID_PLAN_TIERS,
  planPriceLookupKey,
  planProductId,
  toStripeLocale,
  VAT_TAX_RATE,
  VAT_TAX_RATE_METADATA,
} from './billing.catalog';
export {
  billingPortalIntentSchema,
  checkoutSessionIdSchema,
  paidPlanTierSchema,
  openBillingPortalSchema,
  startPlanCheckoutSchema,
} from './billing.validation';
export { applyPlanLimits, assertCanPublishService, getServiceUsage } from './billing.plan-limits';

// Comisiones del pago en el local (Stripe Billing, decidido 2026-10-30).
export { itemizeCommission } from './billing.commission.itemize';
export { scheduleCommissionItemization } from './billing.commission.schedule';
export { runCommissionSweep } from './billing.commission.sweep';
export {
  completeOnsiteSetup,
  confirmOnsiteSetupSession,
  createOnsiteSetupSession,
} from './billing.setup';
export { getOnsiteBillingSummary, setOnsitePaymentAcceptance } from './billing.onsite';
export { onsitePaymentToggleSchema } from './billing.validation';
export {
  OnsiteCommissionDebtError,
  OnsitePaymentMethodMissingError,
} from './billing.onsite.errors';
export type { OnsiteSetupResult } from './billing.setup';
export type { CommissionSweepOptions } from './billing.commission.sweep';

export {
  BillingPlanNotSeededError,
  BillingProviderNotFoundError,
  BillingStripeError,
  CheckoutSessionMismatchError,
  DuplicateSubscriptionError,
  PlanNotPurchasableError,
  PlanPriceMismatchError,
  SubscriptionAlreadyActiveError,
  BillingPortalNotConfiguredError,
  PlanChangeNotAllowedError,
  SubscriptionNotFoundError,
  SubscriptionSyncConflictError,
  VatTaxRateNotConfiguredError,
} from './billing.errors';
export type { PlanChangeBlockReason } from './billing.errors';
export {
  PlanLimitProviderNotFoundError,
  PlanServiceLimitReachedError,
} from './billing.plan-limits';

export type { BillingEventType } from './billing.webhook.service';
export type { PlanLimitsResult, ServiceUsage } from './billing.plan-limits';
export type {
  BillingPortalFlow,
  BillingWebhookResult,
  CommissionSweepSummary,
  ItemizeCommission,
  ItemizeCommissionOutcome,
  OnsiteBillingSummary,
  OnsitePaymentBlockReason,
  PaidPlanTier,
  PlanChange,
  PlanCheckoutSession,
  PlanCheckoutUrls,
  ProviderBillingSummary,
  SubscriptionStatus,
  SubscriptionSyncResult,
} from './billing.types';
export type {
  BillingPortalIntent,
  OpenBillingPortalParsed,
  StartPlanCheckoutParsed,
} from './billing.validation';
