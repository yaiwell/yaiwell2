'use server';

import { revalidatePath } from 'next/cache';

import type { AppLocale } from '@/i18n/routing';
import {
  billingPortalIntentSchema,
  BillingProviderNotFoundError,
  createBillingPortalSession,
  createOnsiteSetupSession,
  createPlanCheckoutSession,
  OnsiteCommissionDebtError,
  OnsitePaymentMethodMissingError,
  onsitePaymentToggleSchema,
  paidPlanTierSchema,
  setOnsitePaymentAcceptance,
  SubscriptionAlreadyActiveError,
  type BillingPortalIntent,
  type PaidPlanTier,
} from '@/lib/services/billing';

import {
  FORBIDDEN,
  INVALID_INPUT,
  isValidLocale,
  planPageUrl,
  resolveProviderId,
  toActionError,
  toPortalFlow,
  type PlanActionResult,
} from './actions.helpers';

export type { PlanActionErrorCode, PlanActionResult } from './actions.helpers';

/** Recorridos del portal que la UI puede pedir (schema en `billing`). */
export type { BillingPortalIntent };

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

/**
 * Códigos de fallo del interruptor «Cobro en el local» (copy i18n en la
 * UI). `PAYMENT_METHOD_MISSING`: falta guardar el método de pago para
 * las comisiones; `COMMISSION_DEBT`: hay comisiones impagadas.
 */
export type OnsiteToggleErrorCode =
  | 'INVALID_INPUT'
  | 'FORBIDDEN'
  | 'PAYMENT_METHOD_MISSING'
  | 'COMMISSION_DEBT'
  | 'INTERNAL';

/** Resultado del interruptor: el estado que ha quedado guardado. */
export type OnsiteToggleResult =
  | { ok: true; enabled: boolean }
  | { ok: false; code: OnsiteToggleErrorCode };

/**
 * Activa o desactiva el pago en el local del negocio (opt-in, §4.bis).
 *
 * Activar exige método de pago guardado y ninguna comisión impagada (lo
 * comprueba el service en el mismo `UPDATE`); desactivar siempre se
 * puede y no toca las reservas en el local ya hechas.
 *
 * @param locale — idioma de la web (para revalidar la página).
 * @param enabled — estado pedido (booleano estricto; lo demás es `INVALID_INPUT`).
 */
export async function toggleOnsitePaymentAction(
  locale: AppLocale,
  enabled: unknown,
): Promise<OnsiteToggleResult> {
  if (!isValidLocale(locale)) return { ok: false, code: 'INVALID_INPUT' };
  const parsed = onsitePaymentToggleSchema.safeParse(enabled);
  if (!parsed.success) return { ok: false, code: 'INVALID_INPUT' };

  const providerId = await resolveProviderId();
  if (!providerId) return { ok: false, code: 'FORBIDDEN' };

  try {
    await setOnsitePaymentAcceptance(providerId, parsed.data);
  } catch (err) {
    if (err instanceof OnsitePaymentMethodMissingError) {
      return { ok: false, code: 'PAYMENT_METHOD_MISSING' };
    }
    if (err instanceof OnsiteCommissionDebtError) return { ok: false, code: 'COMMISSION_DEBT' };
    if (err instanceof BillingProviderNotFoundError) return { ok: false, code: 'FORBIDDEN' };
    console.error('[panel/plan] onsite toggle unexpected:', err);
    return { ok: false, code: 'INTERNAL' };
  }
  revalidatePath(`/${locale}/panel/plan`);
  return { ok: true, enabled: parsed.data };
}

/**
 * Abre el Checkout de Stripe en modo `setup` para guardar el método de
 * pago de las comisiones del pago en el local. A la vuelta, la página
 * recibe `?onsite_setup=success&session_id=…` y puede llamar a
 * `confirmOnsiteSetupSession` (el webhook lo guarda igualmente).
 *
 * @returns la URL de Stripe, igual que las demás actions del plan.
 */
export async function startOnsiteSetupAction(locale: AppLocale): Promise<PlanActionResult> {
  if (!isValidLocale(locale)) return INVALID_INPUT;
  const providerId = await resolveProviderId();
  if (!providerId) return FORBIDDEN;

  const base = planPageUrl(locale);
  try {
    const session = await createOnsiteSetupSession(
      providerId,
      {
        // `{CHECKOUT_SESSION_ID}` lo sustituye Stripe: no se codifica.
        successUrl: `${base}?onsite_setup=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base}?onsite_setup=cancelled`,
      },
      locale,
    );
    return { ok: true, url: session.url };
  } catch (err) {
    return toActionError('onsite-setup', err);
  }
}
