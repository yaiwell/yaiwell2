import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import {
  applyCommissionInvoiceEvent,
  type CommissionInvoiceEventType,
} from './billing.commission.webhook';
import { reportBillingIssue } from './billing.report';

const STRIPE_TIMEOUT_MS = 10_000;

/**
 * Evento equivalente al estado actual de la factura. Una `open` ya
 * intentada sin cobrar cuenta como fallida (como haría el webhook); una
 * `draft` no mueve nada (sigue `itemized` hasta que se finalice).
 */
function eventForStatus(invoice: Stripe.Invoice): CommissionInvoiceEventType | null {
  switch (invoice.status) {
    case 'open':
      return invoice.attempted ? 'invoice.payment_failed' : 'invoice.finalized';
    case 'paid':
      return 'invoice.paid';
    case 'uncollectible':
      return 'invoice.marked_uncollectible';
    case 'void':
      return 'invoice.voided';
    default:
      return null;
  }
}

/**
 * Pone al día una comisión cuyo concepto se ha **recuperado** (reentrega
 * de la clave de idempotencia o adopción de uno ya creado) y que ya está
 * en una factura. Los webhooks de esa factura pueden haber llegado antes
 * de que la fila tuviera el id del concepto y no la encontraron: sin esto
 * se quedaría `itemized` para siempre.
 *
 * Aplica la misma transición que el webhook (solo hacia delante, deuda
 * incluida). No envía avisos: si toca uno, ya lo mandó o lo mandará el
 * webhook de la factura. Nunca lanza: si falla, el webhook siguiente de
 * la factura la pondrá al día.
 */
export async function reconcileItemInvoice(
  providerId: string,
  item: Stripe.InvoiceItem,
  now: Date,
): Promise<void> {
  const ref = item.invoice;
  if (!ref) return;
  try {
    const invoice =
      typeof ref === 'string'
        ? await getStripeClient().invoices.retrieve(ref, {}, { timeout: STRIPE_TIMEOUT_MS })
        : ref;
    const type = eventForStatus(invoice);
    if (type) await applyCommissionInvoiceEvent(type, invoice, now);
  } catch (err) {
    reportBillingIssue(err, providerId, { stripeInvoiceItemId: item.id });
  }
}
