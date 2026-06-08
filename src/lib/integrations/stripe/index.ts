/**
 * API pública de la integración Stripe.
 *
 * Todo lo que viva fuera de `lib/integrations/stripe` debe importar
 * desde este barrel, nunca desde archivos internos. Mantener esta
 * fachada estable nos permite refactorizar el interior (cambiar SDK,
 * añadir caching, swap por mock) sin tocar los call sites.
 */

export { getStripeClient } from './stripe.client';
export { verifyStripeWebhook } from './stripe.webhook';
export { StripeWebhookSignatureError, StripeWebhookConfigError } from './stripe.errors';
