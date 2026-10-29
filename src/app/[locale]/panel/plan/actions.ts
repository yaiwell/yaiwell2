'use server';

import { hasLocale } from 'next-intl';

import { routing, type AppLocale } from '@/i18n/routing';
import { getCurrentProviderId, getCurrentRole } from '@/lib/auth/server';
import { SITE_URL } from '@/lib/seo/site-url';
import {
  BillingPlanNotSeededError,
  BillingPortalNotConfiguredError,
  billingPortalIntentSchema,
  BillingProviderNotFoundError,
  BillingStripeError,
  createBillingPortalSession,
  createPlanCheckoutSession,
  paidPlanTierSchema,
  PlanChangeNotAllowedError,
  PlanNotPurchasableError,
  PlanPriceMismatchError,
  SubscriptionAlreadyActiveError,
  SubscriptionNotFoundError,
  VatTaxRateNotConfiguredError,
  type BillingPortalFlow,
  type BillingPortalIntent,
  type PaidPlanTier,
} from '@/lib/services/billing';

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

/** Recorridos del portal que la UI puede pedir (schema en `billing`). */
export type { BillingPortalIntent };

const INVALID_INPUT: PlanActionResult = { ok: false, code: 'INVALID_INPUT' };
const FORBIDDEN: PlanActionResult = { ok: false, code: 'FORBIDDEN' };

/** Ruta del panel del plan; las URLs de vuelta de Stripe apuntan aquí. */
function planPageUrl(locale: AppLocale): string {
  return `${SITE_URL}/${locale}/panel/plan`;
}

/**
 * El `locale` llega del cliente: se valida antes de usarlo en las URLs
 * que enviamos a Stripe.
 */
function isValidLocale(locale: unknown): locale is AppLocale {
  return typeof locale === 'string' && hasLocale(routing.locales, locale);
}

/**
 * Negocio del usuario en sesión. Usamos las variantes que no redirigen:
 * una action que devuelve una URL no puede responder con un redirect a
 * `/entrar` u `/onboarding`, así que sin rol de negocio o sin negocio
 * contestamos `FORBIDDEN`. La propiedad la garantiza la consulta (solo
 * devuelve el negocio del usuario en sesión).
 */
async function resolveProviderId(): Promise<string | null> {
  const role = await getCurrentRole();
  if (role !== 'provider') return null;
  return getCurrentProviderId();
}

/** Traduce los errores tipados de `billing` a códigos estables. */
function toActionError(scope: string, err: unknown): PlanActionResult {
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
function toPortalFlow(intent: BillingPortalIntent, tier: PaidPlanTier | null): BillingPortalFlow {
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

async function openPortal(
  providerId: string,
  locale: AppLocale,
  intent: BillingPortalIntent,
  tier: PaidPlanTier | null,
): Promise<PlanActionResult> {
  try {
    const url = await createBillingPortalSession(
      providerId,
      toPortalFlow(intent, tier),
      planPageUrl(locale),
      locale,
    );
    return { ok: true, url };
  } catch (err) {
    return toActionError(`portal:${intent}`, err);
  }
}

/**
 * Contrata un plan de pago con Stripe Checkout.
 *
 * Si el negocio ya tiene una suscripción viva no se abre otro Checkout
 * (cobraría dos veces): derivamos al portal para confirmar el cambio de
 * plan, que prorratea.
 *
 * @param locale — idioma de la web (decide el de Stripe y las URLs).
 * @param tier — plan de pago; el Gratis no se contrata.
 */
export async function startPlanCheckoutAction(
  locale: AppLocale,
  tier: unknown,
): Promise<PlanActionResult> {
  if (!isValidLocale(locale)) return INVALID_INPUT;
  const parsedTier = paidPlanTierSchema.safeParse(tier);
  if (!parsedTier.success) return { ok: false, code: 'PLAN_NOT_PURCHASABLE' };

  const providerId = await resolveProviderId();
  if (!providerId) return FORBIDDEN;

  const base = planPageUrl(locale);
  try {
    const session = await createPlanCheckoutSession(
      providerId,
      parsedTier.data,
      {
        // `{CHECKOUT_SESSION_ID}` lo sustituye Stripe: no se codifica.
        successUrl: `${base}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base}?checkout=cancelled`,
      },
      locale,
    );
    return { ok: true, url: session.url };
  } catch (err) {
    if (err instanceof SubscriptionAlreadyActiveError) {
      return openPortal(providerId, locale, 'change', parsedTier.data);
    }
    return toActionError('checkout', err);
  }
}

/**
 * Abre el Customer Portal de Stripe en el recorrido pedido.
 *
 * @param intent — `manage` (facturas y datos), `payment_method` (cambiar
 *   la tarjeta), `change` (pasar a otro plan de pago, exige `tier`) o
 *   `cancel` (pasar a Gratis al acabar el periodo).
 * @param tier — plan destino, solo con `change`.
 */
export async function openBillingPortalAction(
  locale: AppLocale,
  intent: unknown,
  tier?: unknown,
): Promise<PlanActionResult> {
  if (!isValidLocale(locale)) return INVALID_INPUT;
  const parsedIntent = billingPortalIntentSchema.safeParse(intent);
  if (!parsedIntent.success) return INVALID_INPUT;

  let paidTier: PaidPlanTier | null = null;
  if (parsedIntent.data === 'change') {
    const parsedTier = paidPlanTierSchema.safeParse(tier);
    if (!parsedTier.success) return { ok: false, code: 'PLAN_NOT_PURCHASABLE' };
    paidTier = parsedTier.data;
  }

  const providerId = await resolveProviderId();
  if (!providerId) return FORBIDDEN;

  return openPortal(providerId, locale, parsedIntent.data, paidTier);
}
