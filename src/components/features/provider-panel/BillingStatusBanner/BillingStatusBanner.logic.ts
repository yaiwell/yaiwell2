/**
 * Lógica pura del aviso de facturación: qué estado merece aviso y con
 * qué prioridad. Sin `'use client'`: la usan el componente, las páginas
 * (para no montar el aviso si no hay nada que decir) y los tests.
 */
import { AlertCircle, CalendarClock, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react';

import type { ProviderBillingSummary } from '@/lib/services/billing';
import { isLiveSubscriptionStatus } from '@/lib/utils/plan-billing';

import type {
  BillingBannerVariant,
  BillingBannerView,
  CheckoutReturnState,
} from './BillingStatusBanner.types';

/**
 * Decide el aviso a mostrar, o `null` si no hay nada relevante. Orden:
 *  1. Vuelta del Checkout (activando / activado): es lo que el negocio
 *     acaba de hacer.
 *  2. Cobro fallido (`past_due`): si no actualiza la tarjeta pasará a
 *     Gratis y se ocultarán servicios.
 *  3. Primer pago pendiente de confirmar (`incomplete`, p. ej. 3DS).
 *  4. Cancelación a fin de periodo: pasará a Gratis en la fecha.
 *  5. Bajada programada a otro plan de pago.
 */
export function resolveBillingBanner(
  summary: ProviderBillingSummary,
  checkoutState: CheckoutReturnState = null,
): BillingBannerView | null {
  const paidTier = summary.subscribedTier ?? summary.plan.tier;

  if (checkoutState === 'activating') {
    return { variant: 'activating', tone: 'info', tier: paidTier, date: null, portalIntent: null };
  }
  if (checkoutState === 'activated') {
    return {
      variant: 'activated',
      tone: 'ok',
      tier: summary.plan.tier,
      date: null,
      portalIntent: null,
    };
  }

  const status = summary.subscriptionStatus;
  if (status === 'past_due') {
    return {
      variant: 'past_due',
      tone: 'error',
      tier: paidTier,
      date: null,
      portalIntent: 'payment_method',
    };
  }
  if (status === 'incomplete') {
    return {
      variant: 'action_required',
      tone: 'warning',
      tier: paidTier,
      date: null,
      portalIntent: 'manage',
    };
  }
  if (!isLiveSubscriptionStatus(status)) return null;

  if (summary.cancelAtPeriodEnd && summary.currentPeriodEnd) {
    return {
      variant: 'cancel_scheduled',
      tone: 'info',
      tier: summary.plan.tier,
      date: summary.currentPeriodEnd,
      // En el portal se puede deshacer la cancelación («Renovar plan»).
      portalIntent: 'manage',
    };
  }
  if (
    summary.scheduledTier &&
    summary.scheduledTier !== summary.plan.tier &&
    summary.scheduledChangeAt
  ) {
    return {
      variant: 'downgrade_scheduled',
      tone: 'info',
      tier: summary.scheduledTier,
      date: summary.scheduledChangeAt,
      portalIntent: null,
    };
  }
  return null;
}

/** Icono de cada variante del aviso. */
export const BANNER_ICONS: Record<BillingBannerVariant, LucideIcon> = {
  activating: Loader2,
  activated: CheckCircle2,
  past_due: AlertCircle,
  action_required: AlertCircle,
  cancel_scheduled: CalendarClock,
  downgrade_scheduled: CalendarClock,
};

/**
 * Copy del botón de las variantes que abren el portal de Stripe.
 */
export const BANNER_CTA_KEYS: Partial<
  Record<
    BillingBannerVariant,
    'banner.past_due.cta' | 'banner.action_required.cta' | 'banner.cancel_scheduled.cta'
  >
> = {
  past_due: 'banner.past_due.cta',
  action_required: 'banner.action_required.cta',
  cancel_scheduled: 'banner.cancel_scheduled.cta',
};
