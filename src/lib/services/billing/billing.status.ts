import 'server-only';

import { BillingProviderNotFoundError } from './billing.errors';
import { billingRepository } from './billing.repository';
import type { ProviderBillingSummary } from './billing.types';

/**
 * Resumen de facturación para el panel del negocio: plan efectivo con
 * sus límites, uso del cupo y el espejo de la suscripción en Stripe.
 *
 * Solo lee BD (sin llamadas a Stripe): el espejo lo mantienen el webhook
 * y la página de vuelta del Checkout.
 *
 * @throws BillingProviderNotFoundError — si el negocio no existe.
 */
export async function getProviderBillingSummary(
  providerId: string,
): Promise<ProviderBillingSummary> {
  const [row, services] = await Promise.all([
    billingRepository.findSummaryRows(providerId),
    billingRepository.countServices(providerId),
  ]);
  if (!row) throw new BillingProviderNotFoundError();
  const { plan, billing } = row;

  return {
    plan: {
      tier: plan.tier,
      monthlyPriceCents: plan.monthlyPriceCents,
      commissionRateBps: plan.commissionRateBps,
      maxServices: plan.maxServices,
    },
    activeServices: services.active,
    servicesPausedByPlan: services.pausedByPlan,
    hasCustomer: billing !== null,
    subscriptionStatus: billing?.subscriptionStatus ?? null,
    subscribedTier: billing?.subscribedPlan?.tier ?? null,
    currentPeriodEnd: billing?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
    scheduledTier: billing?.scheduledPlan?.tier ?? null,
    scheduledChangeAt: billing?.scheduledChangeAt ?? null,
    lastPaymentFailedAt: billing?.lastPaymentFailedAt ?? null,
  };
}
