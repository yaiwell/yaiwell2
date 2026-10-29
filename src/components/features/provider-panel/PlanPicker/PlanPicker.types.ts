/**
 * Tipos del selector de planes del panel (`/panel/plan`) y de la
 * tarjeta de plan que reutiliza el onboarding.
 */
import type { ReactNode } from 'react';

import type { AppLocale } from '@/i18n/routing';
import type { ProviderBillingSummary, SubscriptionStatus } from '@/lib/services/billing';
import type { PlanTierId, PublicPlan } from '@/lib/services/plans';

/**
 * Qué ofrece el botón de cada tarjeta:
 *  - `current`: es el plan actual (sin acción).
 *  - `subscribe`: contratar con Checkout (sin suscripción viva).
 *  - `change`: cambiar a otro plan de pago en el portal (prorratea).
 *  - `downgrade_free`: cancelar en el portal; pasa a Gratis al acabar
 *    el periodo pagado.
 *  - `scheduled`: es el plan al que ya se va a pasar (sin acción).
 *  - `locked`: hay un cambio programado; hasta que se aplique o se
 *    deshaga desde el portal no se ofrece otro.
 *  - `fix_payment`: el cobro está fallando; primero hay que actualizar
 *    la tarjeta (portal) antes de cambiar de plan.
 *  - `unavailable`: estado incoherente (plan de pago sin suscripción);
 *    lo resuelve soporte.
 */
export type PlanCtaKind =
  | 'current'
  | 'subscribe'
  | 'change'
  | 'downgrade_free'
  | 'scheduled'
  | 'locked'
  | 'fix_payment'
  | 'unavailable';

/** Cambio de plan ya programado en Stripe (fin de periodo). */
export interface PlanSchedule {
  scheduledTier: PlanTierId | null;
  cancelAtPeriodEnd: boolean;
}

export interface PlanPickerProps {
  plans: PublicPlan[];
  summary: ProviderBillingSummary;
  locale: AppLocale;
  /** Plan que llega por `?plan=` (desde un aviso o el onboarding). */
  preselectedTier?: PlanTierId | null;
}

export interface PlanCardProps {
  plan: PublicPlan;
  locale: AppLocale;
  /** Borde destacado: plan actual, seleccionado o preseleccionado. */
  emphasis?: 'none' | 'current' | 'selected';
  /** Etiqueta superior («Tu plan», «Seleccionado»). */
  badge?: string | null;
  /** Pie de la tarjeta (botón del panel). En el onboarding no hay. */
  footer?: ReactNode;
  /** Elemento raíz: `div` cuando la tarjeta va dentro del `label` de un radio. */
  as?: 'article' | 'div';
}

export type { SubscriptionStatus };
