import 'server-only';

import type Stripe from 'stripe';

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
 * Desenlace de una llamada de cancelación. Añade `still_open` a los de
 * `PaymentIntentCancelOutcome`: el intent sigue en `requires_*` aunque
 * Stripe no nos dejase cancelarlo. No hay cobro, así que no es dinero que
 * devolver.
 *
 * Pasa cuando la clave de idempotencia trae cacheado un "no cancelable" de
 * cuando el intent estaba `processing` y el pago acabó fallando después.
 * Stripe guarda esa respuesta 24 h.
 */
export type PaymentIntentCancelAttempt = PaymentIntentCancelOutcome | 'still_open';

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
): Promise<PaymentIntentCancelAttempt> {
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
    switch (intent.status) {
      case 'canceled':
        return 'canceled';
      case 'processing':
        return 'processing';
      case 'succeeded':
      case 'requires_capture':
        // `requires_capture` no se da hoy (captura automática), pero el
        // dinero estaría retenido: lo tratamos como cobrado.
        return 'already_paid';
      default:
        return 'still_open';
    }
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

/**
 * Recupera un PaymentIntent con su último cargo expandido
 * (`latest_charge`), o `charge: null` si no tiene ninguno.
 *
 * Del cargo salen el instante del cobro (`created`, lo más parecido al
 * `event.created` que el webhook usa como `paidAt`) y lo ya reembolsado
 * (`amount_refunded`).
 *
 * @throws cualquier error de Stripe al consultarlo.
 */
export async function retrievePaymentIntentWithCharge(
  paymentIntentId: string,
): Promise<{ intent: Stripe.PaymentIntent; charge: Stripe.Charge | null }> {
  const intent = await getStripeClient().paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });
  const charge = intent.latest_charge;
  return { intent, charge: charge && typeof charge === 'object' ? charge : null };
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
