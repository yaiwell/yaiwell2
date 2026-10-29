import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { BillingStripeError, DuplicateSubscriptionError } from './billing.errors';
import { reportBillingIssue } from './billing.report';

/**
 * Resuelve una suscripción duplicada: el negocio ya tenía otra viva (la
 * guardada) y le ha entrado una segunda (carrera de dos Checkout). Se
 * conserva la guardada y la nueva se deshace sola, sin esperar a soporte:
 *
 *  1. Reembolso íntegro de lo que se cobró en su última factura (el
 *     negocio pagó dos veces el mismo mes).
 *  2. Cancelación inmediata sin prorrateo ni factura final.
 *
 * El orden importa para los reintentos: si el reembolso sale y la
 * cancelación falla, el reintento del webhook vuelve a ver la duplicada
 * viva, el reembolso se repite con la misma clave de idempotencia (Stripe
 * no lo duplica) y la cancelación se reintenta. Al revés, una
 * cancelación hecha con el reembolso fallido haría que el reintento la
 * ignorase (ya no está viva) y el dinero se quedaría sin devolver.
 *
 * Siempre queda en Sentry para que soporte lo vea.
 *
 * @throws BillingStripeError — si Stripe falla (el webhook responde 500).
 */
export async function resolveDuplicateSubscription(
  providerId: string,
  keptSubscriptionId: string,
  duplicate: Stripe.Subscription,
): Promise<void> {
  reportBillingIssue(
    new DuplicateSubscriptionError(providerId, keptSubscriptionId, duplicate.id),
    providerId,
    { keptSubscriptionId, duplicateSubscriptionId: duplicate.id },
  );
  await refundLatestInvoice(providerId, duplicate);
  try {
    await getStripeClient().subscriptions.cancel(
      duplicate.id,
      { invoice_now: false, prorate: false },
      { idempotencyKey: `duplicate-cancel:${duplicate.id}` },
    );
  } catch (err) {
    throw new BillingStripeError('Could not cancel the duplicate subscription.', err);
  }
}

/** Reembolsa los pagos de la última factura de la suscripción duplicada. */
async function refundLatestInvoice(providerId: string, sub: Stripe.Subscription): Promise<void> {
  const invoice = sub.latest_invoice;
  const invoiceId = typeof invoice === 'string' ? invoice : invoice?.id;
  if (!invoiceId) return;

  const stripe = getStripeClient();
  let payments: Stripe.InvoicePayment[];
  try {
    const list = await stripe.invoicePayments.list({
      invoice: invoiceId,
      status: 'paid',
      limit: 10,
    });
    payments = list.data;
  } catch (err) {
    throw new BillingStripeError('Could not list the duplicate invoice payments.', err);
  }

  for (const payment of payments) {
    const intent = payment.payment.payment_intent;
    const intentId = typeof intent === 'string' ? intent : intent?.id;
    if (!intentId) continue;
    try {
      await stripe.refunds.create(
        {
          payment_intent: intentId,
          reason: 'duplicate',
          metadata: { providerId, subscriptionId: sub.id },
        },
        { idempotencyKey: `duplicate-refund:${intentId}` },
      );
    } catch (err) {
      // Ya devuelto (por soporte o por un intento anterior con otra
      // clave): no es un fallo y no debe bloquear la cancelación.
      if (stripeErrorCode(err) === 'charge_already_refunded') continue;
      throw new BillingStripeError('Could not refund the duplicate subscription payment.', err);
    }
  }
}

function stripeErrorCode(err: unknown): unknown {
  return typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : undefined;
}
