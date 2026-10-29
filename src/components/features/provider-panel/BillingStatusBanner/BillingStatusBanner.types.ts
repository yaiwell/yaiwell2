/**
 * Tipos del aviso de estado de facturación del plan.
 */
import type { AppLocale } from '@/i18n/routing';
import type { ProviderBillingSummary } from '@/lib/services/billing';
import type { PlanTierId } from '@/lib/services/plans';

import type { BillingPortalIntent } from '../plan-shared';

/**
 * Resultado de la vuelta del Checkout que calcula `/panel/plan`:
 *  - `activating`: Stripe aún no ha confirmado la suscripción.
 *  - `activated`: la suscripción ya está sincronizada.
 */
export type CheckoutReturnState = 'activating' | 'activated' | null;

export type BillingBannerVariant =
  | 'activating'
  | 'activated'
  | 'past_due'
  | 'action_required'
  | 'cancel_scheduled'
  | 'downgrade_scheduled';

export type BillingBannerTone = 'info' | 'ok' | 'warning' | 'error';

/** Lo que pinta el aviso: copy, tono, fecha y botón. */
export interface BillingBannerView {
  variant: BillingBannerVariant;
  tone: BillingBannerTone;
  /** Plan que nombra el texto («Tu plan Pro termina…»). */
  tier: PlanTierId;
  date: Date | null;
  /** Recorrido del portal del botón, o `null` si no lleva botón. */
  portalIntent: BillingPortalIntent | null;
}

export interface BillingStatusBannerProps {
  summary: ProviderBillingSummary;
  locale: AppLocale;
  checkoutState?: CheckoutReturnState;
  /** En el dashboard añade «Ver mi plan» (en `/panel/plan` sobra). */
  showPlanLink?: boolean;
}
