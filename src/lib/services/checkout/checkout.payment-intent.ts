import 'server-only';

import { isSentryEnabled } from '@/lib/integrations/sentry';
import { getStripeClient } from '@/lib/integrations/stripe';

/**
 * Cancelación de PaymentIntents de reservas que ya no van a pagarse.
 *
 * La comparten el cron de caducidad de `pending` y la cancelación del
 * proveedor sobre una `pending`: en ambos casos queremos que el cliente
 * ya no pueda pagar una reserva muerta, y en ambos casos Stripe puede
 * respondernos que es tarde porque el pago ya se cobró.
 */

/** Stripe no permite cancelar un PaymentIntent en este estado. */
const STRIPE_UNEXPECTED_STATE_CODE = 'payment_intent_unexpected_state';

/**
 * Desenlace de intentar cancelar un PaymentIntent.
 *
 *  - `canceled`: el intent queda cancelado (por esta llamada o ya lo estaba).
 *  - `already_paid`: el cobro ya está hecho; cancelar no es posible y
 *    el dinero hay que devolverlo.
 *  - `processing`: el pago está en curso; si acaba en `succeeded`, el
 *    webhook del pago tardío lo reembolsará.
 */
export type PaymentIntentCancelOutcome = 'canceled' | 'already_paid' | 'processing';

/**
 * Cancela un PaymentIntent con la clave de idempotencia indicada.
 *
 * Ante `payment_intent_unexpected_state` consulta el estado real, porque
 * ese código cubre tanto "ya cancelado" (éxito) como "cobrado o
 * procesando" (no tocar).
 *
 * @param paymentIntentId — intent anclado a la reserva.
 * @param idempotencyKey — clave propia del camino que cancela.
 * @throws cualquier otro error de Stripe; el caller decide si es fatal.
 */
export async function cancelBookingPaymentIntent(
  paymentIntentId: string,
  idempotencyKey: string,
): Promise<PaymentIntentCancelOutcome> {
  const stripe = getStripeClient();
  try {
    await stripe.paymentIntents.cancel(
      paymentIntentId,
      { cancellation_reason: 'abandoned' },
      { idempotencyKey },
    );
    return 'canceled';
  } catch (err) {
    if (!isUnexpectedStateError(err)) throw err;
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === 'canceled') return 'canceled';
    // `requires_capture` no se da hoy (captura automática), pero el
    // dinero estaría retenido: lo tratamos como cobrado.
    return intent.status === 'processing' ? 'processing' : 'already_paid';
  }
}

/**
 * Clasifica el estado real de un PaymentIntent con el mismo vocabulario
 * que la cancelación, o `inconclusive` si sigue vivo (`requires_*`): el
 * cliente aún podría pagarlo.
 *
 * @throws cualquier error de Stripe al consultarlo.
 */
export async function classifyPaymentIntent(
  paymentIntentId: string,
): Promise<PaymentIntentCancelOutcome | 'inconclusive'> {
  const intent = await getStripeClient().paymentIntents.retrieve(paymentIntentId);
  switch (intent.status) {
    case 'canceled':
      return 'canceled';
    case 'processing':
      return 'processing';
    case 'succeeded':
    case 'requires_capture':
      return 'already_paid';
    default:
      return 'inconclusive';
  }
}

function isUnexpectedStateError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { code?: unknown; raw?: { code?: unknown } | null };
  return (
    candidate.code === STRIPE_UNEXPECTED_STATE_CODE ||
    candidate.raw?.code === STRIPE_UNEXPECTED_STATE_CODE
  );
}

/**
 * Sube a Sentry un aviso del flujo de pagos sin bloquear al caller.
 * Mismo patrón que el resto del módulo: import diferido y solo con DSN,
 * para no arrastrar el SDK en tests ni en local.
 */
export function reportCheckoutWarning(
  message: string,
  bookingId: string,
  level: 'warning' | 'error' = 'warning',
): void {
  if (!isSentryEnabled()) return;
  void import('@sentry/nextjs')
    .then((Sentry) => {
      Sentry.captureMessage(message, { level, tags: { domain: 'checkout', bookingId } });
    })
    .catch(() => {
      // Sin Sentry solo queda el log de consola del caller.
    });
}
