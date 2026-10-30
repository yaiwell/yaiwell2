import 'server-only';

import type Stripe from 'stripe';

import type { AppLocale } from '@/i18n/routing';
import { getStripeClient } from '@/lib/integrations/stripe';

import { toStripeLocale } from './billing.catalog';
import { commissionRepository } from './billing.commission.repository';
import { settleCommissionDebt } from './billing.commission.settle';
import { ensureBillingCustomer } from './billing.customer';
import { BillingStripeError, CheckoutSessionMismatchError } from './billing.errors';
import { billingRepository } from './billing.repository';
import type { PlanCheckoutSession, PlanCheckoutUrls } from './billing.types';
import {
  billingLocaleSchema,
  checkoutSessionIdSchema,
  onsiteSetupMetadataSchema,
} from './billing.validation';

/** Etiqueta del flujo en el Dashboard (Checkout → filtros). */
const INTEGRATION_IDENTIFIER = 'yaiwell-onsite-setup-vkdmqrta';

/** Resultado de guardar el método de pago de comisiones. */
export interface OnsiteSetupResult {
  providerId: string;
  paymentMethodId: string;
}

/**
 * Crea un Checkout en modo `setup` para que el negocio guarde el método
 * de pago con el que se le cobrarán las comisiones de las reservas
 * pagadas en el local (requisito para activarlo, §4.bis).
 *
 * No cobra nada: el método queda en el Customer de facturación (el de
 * los planes) y se fija como predeterminado de sus facturas al volver
 * (webhook `checkout.session.completed` o página de vuelta).
 *
 * @param urls — vuelta (con `{CHECKOUT_SESSION_ID}`) y cancelación.
 * @param locale — idioma de la página de Stripe.
 * @throws BillingProviderNotFoundError | BillingStripeError
 */
export async function createOnsiteSetupSession(
  providerId: string,
  urls: PlanCheckoutUrls,
  locale: AppLocale,
): Promise<PlanCheckoutSession> {
  const parsedLocale = billingLocaleSchema.parse(locale);
  const customerId = await ensureBillingCustomer(providerId);
  const metadata = { kind: 'onsite_setup', providerId };
  // Clave por minuto: un doble clic recibe la misma sesión.
  const minute = Math.floor(Date.now() / 60_000);

  let session: Stripe.Checkout.Session;
  try {
    session = await getStripeClient().checkout.sessions.create(
      {
        mode: 'setup',
        customer: customerId,
        // Obligatorio en modo setup sin lista fija de métodos (dinámicos).
        currency: 'eur',
        client_reference_id: providerId,
        metadata,
        setup_intent_data: { metadata },
        locale: toStripeLocale(parsedLocale),
        success_url: urls.successUrl,
        cancel_url: urls.cancelUrl,
        integration_identifier: INTEGRATION_IDENTIFIER,
      },
      { idempotencyKey: `onsite-setup:${providerId}:${parsedLocale}:${minute}` },
    );
  } catch (err) {
    throw new BillingStripeError('Could not create the onsite setup session.', err);
  }
  if (!session.url) throw new BillingStripeError('Setup session has no URL.');
  return { sessionId: session.id, url: session.url };
}

/** Es un Checkout de setup nuestro (lo distingue de los de suscripción). */
export function isOnsiteSetupSession(session: Stripe.Checkout.Session): boolean {
  return session.mode === 'setup' && onsiteSetupMetadataSchema.safeParse(session.metadata).success;
}

/**
 * Fija el método recién guardado como predeterminado de las facturas del
 * Customer y marca `onsitePaymentMethodReadyAt`. Idempotente: repetirlo
 * escribe lo mismo (webhook y página de vuelta pueden llegar los dos).
 * Si el negocio debe comisiones, intenta cobrarlas ya con el método nuevo
 * (`settleCommissionDebt`, idempotente y sin lanzar).
 *
 * El negocio se resuelve por el Customer de la sesión, no por la
 * metadata: es lo que no se puede falsificar desde fuera.
 *
 * @returns `null` si la sesión aún no está completa.
 * @throws CheckoutSessionMismatchError — no es un setup nuestro o el
 *   Customer no es de ningún negocio.
 * @throws BillingStripeError — Stripe no respondió.
 */
export async function completeOnsiteSetup(
  session: Stripe.Checkout.Session,
  now: Date = new Date(),
): Promise<OnsiteSetupResult | null> {
  if (!isOnsiteSetupSession(session)) throw new CheckoutSessionMismatchError();
  if (session.status !== 'complete' || !session.setup_intent) return null;

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const billing = customerId ? await billingRepository.findByCustomerId(customerId) : null;
  if (!billing || !customerId) throw new CheckoutSessionMismatchError();

  const stripe = getStripeClient();
  let paymentMethodId: string | null;
  try {
    const intent =
      typeof session.setup_intent === 'string'
        ? await stripe.setupIntents.retrieve(session.setup_intent)
        : session.setup_intent;
    const pm = intent.payment_method;
    paymentMethodId = typeof pm === 'string' ? pm : (pm?.id ?? null);
    if (intent.status !== 'succeeded' || !paymentMethodId) return null;
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  } catch (err) {
    throw new BillingStripeError('Could not save the onsite payment method.', err);
  }
  await commissionRepository.markPaymentMethodReady(billing.providerId, now);
  // Con comisiones impagadas, cobramos ya con el método nuevo para que el
  // pago en el local vuelva sin esperar a los reintentos de Stripe.
  if (billing.commissionDebtSince) {
    await settleCommissionDebt(billing.providerId, paymentMethodId, now);
  }
  return { providerId: billing.providerId, paymentMethodId };
}

/**
 * Página de vuelta del Checkout de setup: guarda ya el método para que la
 * tarjeta del panel lo muestre sin esperar al webhook.
 *
 * @param sessionId — `session_id` de la URL (no confiable).
 * @param providerId — negocio de la sesión del usuario.
 * @throws CheckoutSessionMismatchError — la sesión no es de este negocio.
 */
export async function confirmOnsiteSetupSession(
  sessionId: string,
  providerId: string,
): Promise<OnsiteSetupResult | null> {
  if (!checkoutSessionIdSchema.safeParse(sessionId).success) {
    throw new CheckoutSessionMismatchError();
  }
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripeClient().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    throw new BillingStripeError('Could not retrieve the setup session.', err);
  }
  // Propiedad antes de escribir nada: un `session_id` ajeno no toca otro negocio.
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const billing = customerId ? await billingRepository.findByCustomerId(customerId) : null;
  if (billing?.providerId !== providerId) throw new CheckoutSessionMismatchError();
  return completeOnsiteSetup(session);
}
