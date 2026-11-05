/**
 * Helpers puros de la cola de reembolsos.
 *
 * Sin `'use client'`: la cola se renderiza en el servidor y estos
 * helpers no dependen del navegador.
 */

const STRIPE_PAYMENTS_URL = 'https://dashboard.stripe.com/payments';

/**
 * Enlace al PaymentIntent en el dashboard de Stripe.
 *
 * El dashboard decide si abre el modo test o el live según la sesión de
 * quien lo abre, así que no distinguimos entornos aquí.
 */
export function buildStripePaymentUrl(paymentIntentId: string): string {
  return `${STRIPE_PAYMENTS_URL}/${encodeURIComponent(paymentIntentId)}`;
}
