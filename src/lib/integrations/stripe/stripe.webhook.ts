import type Stripe from 'stripe';

import { getStripeClient } from './stripe.client';
import { StripeWebhookConfigError, StripeWebhookSignatureError } from './stripe.errors';

/**
 * Verifica la firma de un webhook entrante de Stripe y devuelve el
 * `Stripe.Event` parseado.
 *
 * El SDK de Stripe expone `webhooks.constructEvent(rawBody, signature, secret)`,
 * que hace dos cosas en una llamada:
 *  1. Verifica que la firma del header `stripe-signature` corresponde
 *     al body crudo + el secreto del endpoint.
 *  2. Si verifica, parsea el JSON y devuelve un evento tipado.
 *
 * Es crítico pasar el body **crudo** (`request.text()`), no el parseado.
 * Stripe firma sobre el cuerpo exacto en bytes; cualquier re-serialización
 * cambia whitespace y rompe la firma.
 *
 * @param rawBody — cuerpo de la petición tal cual lo envió Stripe.
 * @param signature — valor del header `stripe-signature`.
 * @returns evento Stripe verificado y parseado.
 * @throws StripeWebhookConfigError si falta `STRIPE_WEBHOOK_SECRET`.
 * @throws StripeWebhookSignatureError si la firma no verifica.
 */
export function verifyStripeWebhook(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new StripeWebhookConfigError();
  }

  const stripe = getStripeClient();
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    // No filtramos el mensaje original del SDK al caller: contiene el
    // body parcial en algunos casos y son logs sensibles. El caller
    // solo necesita saber "firma inválida" para devolver 400.
    throw new StripeWebhookSignatureError();
  }
}
