/**
 * Errores tipados de la integración Stripe.
 *
 * Permiten distinguir en el caller (webhook handler, server actions de
 * pago) qué tipo de fallo ocurrió y devolver respuestas HTTP coherentes
 * sin parsear mensajes de error.
 */

export class StripeWebhookSignatureError extends Error {
  readonly code = 'STRIPE_WEBHOOK_SIGNATURE_INVALID';
  constructor(message = 'Firma del webhook de Stripe inválida.') {
    super(message);
  }
}

export class StripeWebhookConfigError extends Error {
  readonly code = 'STRIPE_WEBHOOK_NOT_CONFIGURED';
  constructor(message = 'STRIPE_WEBHOOK_SECRET no está configurado.') {
    super(message);
  }
}
