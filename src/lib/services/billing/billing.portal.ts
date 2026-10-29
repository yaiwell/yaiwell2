import 'server-only';

import type Stripe from 'stripe';

import type { AppLocale } from '@/i18n/routing';
import { getStripeClient } from '@/lib/integrations/stripe';

import { toStripeLocale } from './billing.catalog';
import { ensureBillingCustomer } from './billing.customer';
import {
  BillingStripeError,
  PlanChangeNotAllowedError,
  SubscriptionNotFoundError,
} from './billing.errors';
import { resolvePortalConfiguration } from './billing.portal-config';
import { resolvePriceForTier, tierFromPrice } from './billing.prices';
import { billingRepository } from './billing.repository';
import { isLiveStatus, nextPhaseOf } from './billing.sync.mapping';
import { retrieveSubscription } from './billing.sync.stripe';
import type { BillingPortalFlow, PaidPlanTier } from './billing.types';
import { billingLocaleSchema, openBillingPortalSchema } from './billing.validation';

type FlowData = Stripe.BillingPortal.SessionCreateParams.FlowData;

/**
 * Abre el Customer Portal de Stripe para el negocio.
 *
 * Recorridos:
 *  - `manage`: portada del portal (facturas, datos de facturación).
 *  - `payment_method_update`: cambiar la tarjeta (impago).
 *  - `subscription_update_confirm`: confirmar el cambio a un tier
 *    concreto; Stripe prorratea la subida y, según la configuración del
 *    portal, programa la bajada a fin de periodo.
 *  - `subscription_cancel`: cancelar (pasa a Gratis al acabar el periodo).
 *
 * El portal no cambia el plan: lo hace la sincronización al llegar el
 * webhook de la suscripción.
 *
 * @param returnUrl — vuelta al panel al terminar o salir del portal.
 * @returns URL del portal (de un solo uso, caduca en minutos).
 * @throws SubscriptionNotFoundError — si el recorrido exige suscripción viva.
 * @throws PlanChangeNotAllowedError — cambio con impago, con otro cambio
 *   programado o al mismo plan.
 * @throws BillingPortalNotConfiguredError — falta la configuración del portal.
 * @throws PlanPriceMismatchError | BillingProviderNotFoundError | BillingStripeError
 */
export async function createBillingPortalSession(
  providerId: string,
  flow: BillingPortalFlow,
  returnUrl: string,
  locale: AppLocale,
): Promise<string> {
  const parsedFlow = openBillingPortalSchema.parse(flow);
  const customer = await ensureBillingCustomer(providerId);
  const [flowData, configuration] = await Promise.all([
    buildFlowData(providerId, parsedFlow, returnUrl),
    resolvePortalConfiguration(),
  ]);

  let session: Stripe.BillingPortal.Session;
  try {
    session = await getStripeClient().billingPortal.sessions.create({
      customer,
      configuration,
      return_url: returnUrl,
      locale: toStripeLocale(billingLocaleSchema.parse(locale)),
      ...(flowData ? { flow_data: flowData } : {}),
    });
  } catch (err) {
    throw new BillingStripeError('Could not create the billing portal session.', err);
  }
  return session.url;
}

async function buildFlowData(
  providerId: string,
  flow: BillingPortalFlow,
  returnUrl: string,
): Promise<FlowData | null> {
  // Al terminar el recorrido volvemos al panel en vez de quedarnos en el
  // portal: el panel enseña el estado ya sincronizado.
  const afterCompletion: FlowData['after_completion'] = {
    type: 'redirect',
    redirect: { return_url: returnUrl },
  };
  switch (flow.type) {
    case 'manage':
      return null;
    case 'payment_method_update':
      return { type: 'payment_method_update', after_completion: afterCompletion };
    case 'subscription_cancel': {
      const { stripeSubscriptionId: subscriptionId } = await requireLiveSubscription(providerId);
      return {
        type: 'subscription_cancel',
        subscription_cancel: { subscription: subscriptionId },
        after_completion: afterCompletion,
      };
    }
    case 'subscription_update_confirm': {
      const billing = await requireLiveSubscription(providerId);
      const subscriptionId = billing.stripeSubscriptionId;
      const [sub, price] = await Promise.all([
        retrieveSubscription(subscriptionId),
        resolvePriceForTier(flow.tier),
      ]);
      const item = sub.items.data[0];
      if (!item) throw new SubscriptionNotFoundError();
      assertPlanChangeAllowed(billing, sub, flow.tier);
      return {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: subscriptionId,
          items: [{ id: item.id, price: price.id, quantity: 1 }],
        },
        after_completion: afterCompletion,
      };
    }
  }
}

/** Fila del espejo con suscripción viva; si no la hay, lanza. */
async function requireLiveSubscription(providerId: string) {
  const billing = await billingRepository.findByProviderId(providerId);
  const subscriptionId = billing?.stripeSubscriptionId;
  if (!billing || !subscriptionId || !billing.subscriptionStatus) {
    throw new SubscriptionNotFoundError();
  }
  if (!isLiveStatus(billing.subscriptionStatus)) throw new SubscriptionNotFoundError();
  return { ...billing, stripeSubscriptionId: subscriptionId };
}

/**
 * Reglas del cambio de plan, las mismas que aplica la UI (el servidor
 * no se fía de que el botón estuviera oculto):
 *  - con un cobro pendiente (`past_due`) primero hay que pagar: cambiar
 *    de plan generaría otra factura sobre una impagada;
 *  - con un cambio ya programado, el portal no admite otro encima;
 *  - pedir el plan que ya se paga no es un cambio.
 * El estado y el tier se leen de Stripe (recién leído), no del espejo.
 *
 * @throws PlanChangeNotAllowedError
 */
function assertPlanChangeAllowed(
  billing: { scheduledPlanId: string | null },
  sub: Stripe.Subscription,
  tier: PaidPlanTier,
): void {
  if (sub.status === 'past_due') throw new PlanChangeNotAllowedError('past_due');
  if (billing.scheduledPlanId || nextPhaseOf(sub)) {
    throw new PlanChangeNotAllowedError('scheduled_change');
  }
  if (tierFromPrice(sub.items.data[0]?.price) === tier) {
    throw new PlanChangeNotAllowedError('same_plan');
  }
}
