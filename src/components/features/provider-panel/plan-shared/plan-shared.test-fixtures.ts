/**
 * Resumen de facturación base para los tests de los componentes del
 * plan: negocio en Gratis, sin Customer de Stripe.
 */
import type { ProviderBillingSummary } from '@/lib/services/billing';

export function buildSummary(patch: Partial<ProviderBillingSummary> = {}): ProviderBillingSummary {
  return {
    plan: { tier: 'free', monthlyPriceCents: 0, commissionRateBps: 1200, maxServices: 1 },
    activeServices: 1,
    servicesPausedByPlan: 0,
    hasCustomer: false,
    subscriptionStatus: null,
    subscribedTier: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    scheduledTier: null,
    scheduledChangeAt: null,
    lastPaymentFailedAt: null,
    ...patch,
  };
}

/** Negocio en Pro con la suscripción al día. */
export const PRO_ACTIVE: Partial<ProviderBillingSummary> = {
  plan: { tier: 'pro', monthlyPriceCents: 4900, commissionRateBps: 800, maxServices: 50 },
  hasCustomer: true,
  subscriptionStatus: 'active',
  subscribedTier: 'pro',
  currentPeriodEnd: new Date('2026-11-29T10:00:00Z'),
};
