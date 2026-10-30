import 'server-only';

import type Stripe from 'stripe';

import type { AppLocale } from '@/i18n/routing';
import { getStripeClient } from '@/lib/integrations/stripe';

import { toStripeLocale } from './billing.catalog';
import { reuseOrExpireOpenSessions } from './billing.checkout-sessions';
import { invoiceCommissionsBeforePlan } from './billing.commission.pre-plan';
import { ensureBillingCustomer } from './billing.customer';
import {
  BillingStripeError,
  CheckoutSessionMismatchError,
  PlanNotPurchasableError,
  SubscriptionAlreadyActiveError,
} from './billing.errors';
import { resolvePriceForTier } from './billing.prices';
import { billingRepository } from './billing.repository';
import { syncSubscription } from './billing.sync';
import { resolveVatTaxRate } from './billing.tax';
import { isLiveStatus } from './billing.sync.mapping';
import type {
  PlanCheckoutSession,
  PlanCheckoutUrls,
  SubscriptionSyncResult,
} from './billing.types';
import {
  billingLocaleSchema,
  checkoutSessionIdSchema,
  paidPlanTierSchema,
  providerMetadataSchema,
} from './billing.validation';

/**
 * Etiqueta del flujo en el Dashboard de Stripe (Checkout → filtros), para
 * comparar conversiones de este Checkout con otros que se añadan.
 */
const INTEGRATION_IDENTIFIER = 'yaiwell-plans-qhtzrmkw';

/**
 * Crea la sesión de Checkout para contratar un plan de pago.
 *
 * Antes de crear, reutiliza la sesión abierta equivalente o caduca las
 * demás (`reuseOrExpireOpenSessions`): nunca quedan dos pagables.
 *
 * Solo para quien no tiene suscripción viva: los cambios entre planes de
 * pago van por el Customer Portal (prorratea y no duplica cobros). La
 * comprobación mira el espejo y, por si el webhook aún no ha llegado,
 * también las suscripciones del Customer en Stripe.
 *
 * El plan no cambia aquí: lo cambia la sincronización cuando Stripe
 * confirma el pago (webhook o página de vuelta).
 *
 * @param providerId — negocio (ya autorizado por el caller).
 * @param tier — plan a contratar; el Gratis no se vende.
 * @param urls — vuelta tras pagar (con `{CHECKOUT_SESSION_ID}`) o cancelar.
 * @param locale — idioma de la página de pago.
 * @throws PlanNotPurchasableError | SubscriptionAlreadyActiveError
 *   | PlanPriceMismatchError | BillingPlanNotSeededError | VatTaxRateNotConfiguredError
 *   | BillingProviderNotFoundError | BillingStripeError
 */
export async function createPlanCheckoutSession(
  providerId: string,
  tier: string,
  urls: PlanCheckoutUrls,
  locale: AppLocale,
): Promise<PlanCheckoutSession> {
  const parsedTier = paidPlanTierSchema.safeParse(tier);
  if (!parsedTier.success) throw new PlanNotPurchasableError();
  const parsedLocale = billingLocaleSchema.parse(locale);

  const mirror = await billingRepository.findByProviderId(providerId);
  if (mirror?.subscriptionStatus && isLiveStatus(mirror.subscriptionStatus)) {
    throw new SubscriptionAlreadyActiveError();
  }
  const customerId = await ensureBillingCustomer(providerId);
  await assertNoLiveSubscriptionInStripe(customerId);
  // Comisiones del pago en el local pendientes: van en su propia factura.
  // Si no, entrarían en la primera del plan sin aparecer en el Checkout.
  await invoiceCommissionsBeforePlan(providerId, customerId);
  const [price, vatTaxRateId] = await Promise.all([
    resolvePriceForTier(parsedTier.data),
    resolveVatTaxRate(),
  ]);
  const stripeLocale = toStripeLocale(parsedLocale);
  const reusable = await reuseOrExpireOpenSessions(customerId, {
    tier: parsedTier.data,
    stripeLocale,
    successUrl: urls.successUrl,
  });
  if (reusable) return reusable;

  // Clave por minuto: un doble clic recibe la misma sesión; un intento
  // un rato después (sesión caducada o abandonada) crea otra.
  const minute = Math.floor(Date.now() / 60_000);
  const idempotencyKey = `plan-checkout:${providerId}:${parsedTier.data}:${parsedLocale}:${minute}`;
  const metadata = { providerId, tier: parsedTier.data };

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripeClient().checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: providerId,
        metadata,
        // IVA en la suscripción (no en el item): se aplica también a las
        // renovaciones, prorrateos y cambios de plan del portal, porque
        // los items nuevos sin `tax_rates` heredan los de la suscripción.
        subscription_data: { metadata, default_tax_rates: [vatTaxRateId] },
        locale: stripeLocale,
        // Factura a nombre del negocio con su dirección y NIF/CIF: la
        // cuota es un gasto deducible para él.
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true },
        customer_update: { name: 'auto', address: 'auto' },
        // En modo suscripción Checkout guarda el método de pago como
        // predeterminado de la suscripción: las renovaciones lo usan.
        success_url: urls.successUrl,
        cancel_url: urls.cancelUrl,
        integration_identifier: INTEGRATION_IDENTIFIER,
      },
      { idempotencyKey },
    );
  } catch (err) {
    throw new BillingStripeError('Could not create the plan checkout session.', err);
  }
  if (!session.url) throw new BillingStripeError('Checkout session has no URL.');
  return { sessionId: session.id, url: session.url };
}

/** Comprueba en Stripe que el Customer no tenga ya una suscripción viva. */
async function assertNoLiveSubscriptionInStripe(customerId: string): Promise<void> {
  let subscriptions: Stripe.ApiList<Stripe.Subscription>;
  try {
    subscriptions = await getStripeClient().subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
  } catch (err) {
    throw new BillingStripeError('Could not list subscriptions.', err);
  }
  if (subscriptions.data.some((sub) => isLiveStatus(sub.status))) {
    throw new SubscriptionAlreadyActiveError();
  }
}

/**
 * Página de vuelta del Checkout: sincroniza ya la suscripción para que
 * el panel muestre el plan nuevo sin esperar al webhook. Es idempotente
 * con él (los dos escriben el estado actual que devuelve Stripe).
 *
 * @param sessionId — `session_id` de la URL de vuelta (no confiable).
 * @param providerId — negocio de la sesión del usuario.
 * @returns el resultado de la sincronización, o `null` si el pago aún
 *   no ha terminado (la suscripción llegará por webhook).
 * @throws CheckoutSessionMismatchError — si la sesión no es de este negocio.
 */
export async function confirmCheckoutSession(
  sessionId: string,
  providerId: string,
): Promise<SubscriptionSyncResult | null> {
  if (!checkoutSessionIdSchema.safeParse(sessionId).success) {
    throw new CheckoutSessionMismatchError();
  }
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripeClient().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    throw new BillingStripeError('Could not retrieve the checkout session.', err);
  }
  const metadata = providerMetadataSchema.safeParse(session.metadata);
  if (
    session.mode !== 'subscription' ||
    !metadata.success ||
    metadata.data.providerId !== providerId
  ) {
    throw new CheckoutSessionMismatchError();
  }
  const subscription = session.subscription;
  if (session.status !== 'complete' || !subscription) return null;
  return syncSubscription(typeof subscription === 'string' ? subscription : subscription.id);
}
