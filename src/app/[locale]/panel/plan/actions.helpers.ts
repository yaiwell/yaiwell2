import 'server-only';

import { hasLocale } from 'next-intl';

import { routing, type AppLocale } from '@/i18n/routing';
import { getCurrentProviderId, getCurrentRole } from '@/lib/auth/server';
import { SITE_URL } from '@/lib/seo/site-url';
import {
  BillingPlanNotSeededError,
  BillingPortalNotConfiguredError,
  BillingProviderNotFoundError,
  BillingStripeError,
  PlanChangeNotAllowedError,
  PlanNotPurchasableError,
  PlanPriceMismatchError,
  SubscriptionNotFoundError,
  VatTaxRateNotConfiguredError,
  type BillingPortalFlow,
  type BillingPortalIntent,
  type PaidPlanTier,
} from '@/lib/services/billing';

/**
 * Piezas comunes de las server actions de `/panel/plan` (validación del
 * idioma, negocio en sesión, URLs de vuelta y traducción de errores).
 * Fuera de `actions.ts` porque un fichero `'use server'` solo puede
 * exportar funciones async, y para que no pase de ~250 líneas.
 */

/**
 * Códigos de fallo estables que la UI del plan traduce a copy i18n
 * (`providerPanel.plan.errors.*`). Nunca viajan mensajes internos.
 */
export type PlanActionErrorCode =
  | 'INVALID_INPUT'
  | 'FORBIDDEN'
  | 'PLAN_NOT_PURCHASABLE'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'PLAN_UNAVAILABLE'
  | 'STRIPE_FAILED'
  | 'INTERNAL';

/**
 * Resultado de las actions de facturación. En éxito devolvemos la URL
 * de Stripe (Checkout o portal) y el cliente hace `window.location.assign`:
 * así el botón mantiene su estado de carga hasta que el navegador sale.
 */
export type PlanActionResult = { ok: true; url: string } | { ok: false; code: PlanActionErrorCode };

export const INVALID_INPUT: PlanActionResult = { ok: false, code: 'INVALID_INPUT' };
export const FORBIDDEN: PlanActionResult = { ok: false, code: 'FORBIDDEN' };

/** Ruta del panel del plan; las URLs de vuelta de Stripe apuntan aquí. */
export function planPageUrl(locale: AppLocale): string {
  return `${SITE_URL}/${locale}/panel/plan`;
}

/**
 * El `locale` llega del cliente: se valida antes de usarlo en las URLs
 * que enviamos a Stripe.
 */
export function isValidLocale(locale: unknown): locale is AppLocale {
  return typeof locale === 'string' && hasLocale(routing.locales, locale);
}

/**
 * Negocio del usuario en sesión. Usamos las variantes que no redirigen:
 * una action que devuelve una URL no puede responder con un redirect a
 * `/entrar` u `/onboarding`, así que sin rol de negocio o sin negocio
 * contestamos `FORBIDDEN`. La propiedad la garantiza la consulta (solo
 * devuelve el negocio del usuario en sesión).
 */
export async function resolveProviderId(): Promise<string | null> {
  const role = await getCurrentRole();
  if (role !== 'provider') return null;
  return getCurrentProviderId();
}

/** Traduce los errores tipados de `billing` a códigos estables. */
export function toActionError(scope: string, err: unknown): PlanActionResult {
  if (err instanceof PlanNotPurchasableError) return { ok: false, code: 'PLAN_NOT_PURCHASABLE' };
  // Mismas reglas que la UI (impago, cambio ya programado, mismo plan):
  // solo llega aquí si alguien se salta el botón. Sin código propio para
  // no exigir copy nuevo en la UI.
  if (err instanceof PlanChangeNotAllowedError) return { ok: false, code: 'PLAN_NOT_PURCHASABLE' };
  if (err instanceof SubscriptionNotFoundError) {
    return { ok: false, code: 'SUBSCRIPTION_NOT_FOUND' };
  }
  if (err instanceof BillingProviderNotFoundError) return FORBIDDEN;
  if (
    err instanceof PlanPriceMismatchError ||
    err instanceof BillingPlanNotSeededError ||
    err instanceof VatTaxRateNotConfiguredError ||
    err instanceof BillingPortalNotConfiguredError
  ) {
    // Catálogo de Stripe (precio, IVA o portal) desalineado o sin crear:
    // no vendemos hasta ejecutar `stripe:sync-plans`. Lo vemos en Sentry.
    console.error(`[panel/plan] ${scope} plan unavailable:`, err);
    return { ok: false, code: 'PLAN_UNAVAILABLE' };
  }
  if (err instanceof BillingStripeError) {
    console.error(`[panel/plan] ${scope} stripe failed:`, err.cause ?? err);
    return { ok: false, code: 'STRIPE_FAILED' };
  }
  console.error(`[panel/plan] ${scope} unexpected:`, err);
  return { ok: false, code: 'INTERNAL' };
}

/** Traduce la intención de la UI al recorrido del portal de Stripe. */
export function toPortalFlow(
  intent: BillingPortalIntent,
  tier: PaidPlanTier | null,
): BillingPortalFlow {
  switch (intent) {
    case 'manage':
      return { type: 'manage' };
    case 'payment_method':
      return { type: 'payment_method_update' };
    case 'cancel':
      return { type: 'subscription_cancel' };
    case 'change':
      // `tier` validado por el caller: `change` sin tier no llega aquí.
      return { type: 'subscription_update_confirm', tier: tier as PaidPlanTier };
  }
}
