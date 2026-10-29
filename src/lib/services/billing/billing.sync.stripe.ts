import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { BillingStripeError } from './billing.errors';
import { isLiveStatus, type PhasePriceRef } from './billing.sync.mapping';

/**
 * Lecturas a Stripe de la sincronización. Separadas para que
 * `billing.sync.ts` solo contenga la decisión y la escritura.
 */

/**
 * Lee la suscripción actual. La sincronización NUNCA usa el objeto del
 * evento: los eventos llegan desordenados y reintentados, y el estado
 * vigente es el único que no puede quedarse atrás.
 */
export async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await getStripeClient().subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price', 'schedule'],
    });
  } catch (err) {
    throw new BillingStripeError('Could not retrieve the subscription.', err);
  }
}

/**
 * ¿Sigue viva otra suscripción guardada? Una que ya no existe en Stripe
 * cuenta como muerta.
 */
export async function isSubscriptionLive(subscriptionId: string): Promise<boolean> {
  try {
    const sub = await getStripeClient().subscriptions.retrieve(subscriptionId);
    return isLiveStatus(sub.status);
  } catch (err) {
    if (isResourceMissing(err)) return false;
    throw new BillingStripeError('Could not retrieve the stored subscription.', err);
  }
}

/**
 * Otra suscripción viva del mismo Customer (p. ej. la duplicada que
 * quedó tras cancelar soporte la que teníamos guardada).
 */
export async function findLiveSibling(
  customerId: string,
  excludeId: string,
): Promise<string | null> {
  let list: Stripe.ApiList<Stripe.Subscription>;
  try {
    list = await getStripeClient().subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });
  } catch (err) {
    throw new BillingStripeError('Could not list subscriptions.', err);
  }
  return list.data.find((sub) => sub.id !== excludeId && isLiveStatus(sub.status))?.id ?? null;
}

/** Price de la fase siguiente; el schedule expandido lo trae como id. */
export async function loadPhasePrice(
  ref: PhasePriceRef,
): Promise<Stripe.Price | Stripe.DeletedPrice | null> {
  if (typeof ref !== 'string') return ref;
  try {
    return await getStripeClient().prices.retrieve(ref);
  } catch (err) {
    throw new BillingStripeError('Could not retrieve the scheduled price.', err);
  }
}

function isResourceMissing(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'resource_missing'
  );
}
