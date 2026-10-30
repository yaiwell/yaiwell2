import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { BillingStripeError } from './billing.errors';
import type { PlanCheckoutSession } from './billing.types';
import { providerMetadataSchema } from './billing.validation';

/** Lo que tiene que coincidir para reutilizar una sesión abierta. */
export interface OpenSessionMatch {
  tier: string;
  stripeLocale: string;
  successUrl: string;
}

/**
 * Deja como mucho UNA sesión de Checkout de plan abierta por Customer,
 * para que no se puedan pagar dos (dos pestañas, doble clic, «atrás»):
 *
 *  - Si hay una abierta del mismo tier, idioma y vuelta, se reutiliza: es
 *    la misma compra y su URL sigue valiendo (también cubre el doble clic
 *    que repite la clave de idempotencia de `sessions.create`).
 *  - Las demás abiertas se caducan (`expire`) antes de crear la nueva.
 *
 * Solo toca sesiones de suscripción con nuestra metadata.
 *
 * @returns la sesión reutilizable o `null` si hay que crear otra.
 * @throws BillingStripeError — si Stripe falla.
 */
export async function reuseOrExpireOpenSessions(
  customerId: string,
  match: OpenSessionMatch,
): Promise<PlanCheckoutSession | null> {
  const stripe = getStripeClient();
  let open: Stripe.Checkout.Session[];
  try {
    const list = await stripe.checkout.sessions.list({
      customer: customerId,
      status: 'open',
      limit: 20,
    });
    open = list.data.filter(
      (session) =>
        session.mode === 'subscription' &&
        providerMetadataSchema.safeParse(session.metadata).success,
    );
  } catch (err) {
    throw new BillingStripeError('Could not list open checkout sessions.', err);
  }

  const reusable = open.find(
    (session) =>
      session.url &&
      session.metadata?.tier === match.tier &&
      session.locale === match.stripeLocale &&
      session.success_url === match.successUrl,
  );
  for (const session of open) {
    if (session.id === reusable?.id) continue;
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (err) {
      // Se ha completado o caducado entre medias (Stripe solo caduca las
      // `open`): no es un fallo. Si se completó, la comprobación de
      // suscripción viva lo frena en el siguiente intento.
      if (!(await isStillOpen(session.id))) continue;
      throw new BillingStripeError('Could not expire an open checkout session.', err);
    }
  }
  return reusable?.url ? { sessionId: reusable.id, url: reusable.url } : null;
}

async function isStillOpen(sessionId: string): Promise<boolean> {
  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    return session.status === 'open';
  } catch {
    return true;
  }
}

/**
 * El Customer tiene abierta una sesión de Checkout de plan. Mientras lo
 * esté, un concepto de comisión suelto entraría en la primera factura de
 * la suscripción sin aparecer en la página de pago: `itemizeCommission`
 * lo aplaza.
 *
 * @throws BillingStripeError — si Stripe no responde.
 */
export async function hasOpenPlanCheckout(customerId: string): Promise<boolean> {
  try {
    const list = await getStripeClient().checkout.sessions.list(
      { customer: customerId, status: 'open', limit: 20 },
      { timeout: 10_000 },
    );
    return list.data.some(
      (session) =>
        session.mode === 'subscription' &&
        providerMetadataSchema.safeParse(session.metadata).success,
    );
  } catch (err) {
    throw new BillingStripeError('Could not list open checkout sessions.', err);
  }
}
