import 'server-only';

import type Stripe from 'stripe';

import { BillingProviderNotFoundError } from './billing.errors';
import { billingRepository } from './billing.repository';
import { syncSubscription } from './billing.sync';
import type { BillingWebhookResult } from './billing.types';

/** Eventos de Stripe Billing que procesa el webhook. */
export const BILLING_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.paid',
] as const;

export type BillingEventType = (typeof BILLING_EVENTS)[number];

/** Type guard sobre `BILLING_EVENTS`. */
export function isBillingEvent(type: string): type is BillingEventType {
  return (BILLING_EVENTS as readonly string[]).includes(type);
}

/**
 * Procesa un evento de facturación ya verificado.
 *
 * El negocio se resuelve por el Customer (`provider_billing`), no por
 * metadata: es el objeto de Stripe que delimita la propiedad y no se
 * puede editar desde fuera. Idempotente: la sincronización escribe el
 * estado actual de Stripe y los avisos se reclaman con clave atómica.
 *
 * @returns qué cambió y qué avisos tocan (los programa la ruta).
 * @throws BillingProviderNotFoundError — evento de un Customer ajeno
 *   (la ruta responde 200 `handled: false`).
 * @throws cualquier otro error — transitorio (la ruta responde 500).
 */
export async function handleBillingEvent(event: Stripe.Event): Promise<BillingWebhookResult> {
  // Evento de una cuenta conectada (Connect): las cuotas de plan se cobran
  // en la cuenta de la plataforma, nunca en la del negocio.
  if (event.account) return { handled: false };
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return fromSync(await syncSubscription(event.data.object.id));
    case 'invoice.payment_failed':
    case 'invoice.payment_action_required':
      return handlePaymentProblem(event.data.object, new Date(event.created * 1000));
    case 'invoice.paid':
      return handleInvoicePaid(event.data.object);
    default:
      return { handled: false };
  }
}

/** Solo los Checkout de suscripción son nuestros; los de pago, no. */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<BillingWebhookResult> {
  if (session.mode !== 'subscription' || !session.subscription) return { handled: false };
  const id =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
  return fromSync(await syncSubscription(id));
}

/**
 * Cobro fallido o pendiente de autenticación (3DS) de una renovación.
 * Guarda la fecha para el panel y reclama el aviso por `invoice:intento`:
 * una reentrega no repite el correo, un reintento nuevo de Stripe sí.
 */
async function handlePaymentProblem(
  invoice: Stripe.Invoice,
  failedAt: Date,
): Promise<BillingWebhookResult> {
  const subscriptionId = subscriptionIdOf(invoice);
  if (!subscriptionId) return { handled: false };
  const providerId = await providerIdForInvoice(invoice);

  // Primero la sincronización: si adopta esta suscripción, el reclamo
  // del aviso (filtrado por la suscripción en curso) ya la ve.
  const sync = await syncSubscription(subscriptionId);
  const claimed = await billingRepository.claimPaymentFailure(
    providerId,
    subscriptionId,
    failedAt,
    `${invoice.id}:${invoice.attempt_count}`,
  );
  // Sin aviso en el primer cobro (el dueño está en el Checkout y ve el
  // error allí) ni si este fallo ya ha bajado el plan a Gratis: entonces
  // el correo que toca es el de la bajada.
  const notify =
    claimed && invoice.billing_reason !== 'subscription_create' && sync.planChanged?.to !== 'free';
  return {
    handled: true,
    providerId,
    ...(sync.planChanged ? { planChanged: sync.planChanged } : {}),
    ...(notify ? { paymentFailedKey: `${invoice.id}:${invoice.attempt_count}` } : {}),
  };
}

/**
 * Pago correcto: refresca el espejo y limpia el impago si el pago es de
 * la suscripción en curso.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<BillingWebhookResult> {
  const subscriptionId = subscriptionIdOf(invoice);
  if (!subscriptionId) return { handled: false };
  const providerId = await providerIdForInvoice(invoice);
  const sync = await syncSubscription(subscriptionId);
  const cleared = await billingRepository.clearPaymentFailure(providerId, subscriptionId);
  return { ...fromSync(sync), handled: sync.changed || cleared };
}

/**
 * Suscripción de la factura. En la API dahlia vive en
 * `parent.subscription_details.subscription`; las facturas sueltas (sin
 * suscripción) no son de planes.
 */
function subscriptionIdOf(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return null;
  return typeof ref === 'string' ? ref : ref.id;
}

async function providerIdForInvoice(invoice: Stripe.Invoice): Promise<string> {
  const customer = invoice.customer;
  const customerId = typeof customer === 'string' ? customer : customer?.id;
  const billing = customerId ? await billingRepository.findByCustomerId(customerId) : null;
  if (!billing) throw new BillingProviderNotFoundError(`Invoice ${invoice.id} has no provider.`);
  return billing.providerId;
}

function fromSync(sync: {
  changed: boolean;
  providerId: string;
  planChanged?: BillingWebhookResult['planChanged'];
}): BillingWebhookResult {
  return {
    handled: sync.changed,
    providerId: sync.providerId,
    ...(sync.planChanged ? { planChanged: sync.planChanged } : {}),
  };
}
