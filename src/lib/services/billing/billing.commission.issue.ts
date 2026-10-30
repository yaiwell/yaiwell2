import 'server-only';

import type Stripe from 'stripe';

import type { AppLocale } from '@/i18n/routing';
import { getStripeClient } from '@/lib/integrations/stripe';

import { buildCommissionInvoiceDescription } from './billing.commission.description';
import { reportBillingIssue } from './billing.report';

/** Tope por llamada a Stripe (cron con presupuesto, alta de plan con usuario esperando). */
const STRIPE_TIMEOUT_MS = 10_000;

/** Datos para emitir una factura suelta de comisiones. */
export interface CommissionInvoiceRequest {
  providerId: string;
  customerId: string;
  locale: AppLocale;
  idempotencyKey: string;
  /** Va a `metadata` junto a `kind` y `providerId` (p. ej. el periodo). */
  metadata: Record<string, string>;
}

/**
 * Crea el borrador de una factura suelta con **todos** los conceptos
 * pendientes del Customer (`pending_invoice_items_behavior: 'include'`),
 * cobrada sola con su método por defecto (`charge_automatically`).
 *
 * Al crearla, los conceptos quedan ya enlazados a este borrador: aunque
 * finalizar falle, no se cuelan en otra factura (y `auto_advance` la
 * finaliza sola en ~1 h).
 *
 * @returns la factura; `null` si estaba vacía (el borrador se borra).
 * @throws el error de Stripe al crearla (cada caller decide qué hacer).
 */
export async function createCommissionInvoiceDraft(
  request: CommissionInvoiceRequest,
): Promise<Stripe.Invoice | null> {
  const invoice = await getStripeClient().invoices.create(
    {
      customer: request.customerId,
      collection_method: 'charge_automatically',
      pending_invoice_items_behavior: 'include',
      auto_advance: true,
      description: buildCommissionInvoiceDescription(request.locale),
      metadata: {
        ...request.metadata,
        kind: 'onsite_commission_invoice',
        providerId: request.providerId,
      },
    },
    { idempotencyKey: request.idempotencyKey, timeout: STRIPE_TIMEOUT_MS },
  );
  if (invoice.lines.data.length > 0) return invoice;
  await deleteEmptyDraft(request.providerId, invoice);
  return null;
}

/**
 * Finaliza el borrador para que el cobro salga ya. Nunca lanza: si falla,
 * `auto_advance` lo finaliza solo y no es un fallo de cobro.
 */
export async function finalizeCommissionInvoice(
  providerId: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  if (invoice.status !== 'draft' || !invoice.id) return;
  try {
    await getStripeClient().invoices.finalizeInvoice(
      invoice.id,
      { auto_advance: true },
      { timeout: STRIPE_TIMEOUT_MS },
    );
  } catch (err) {
    reportBillingIssue(err, providerId, { stripeInvoiceId: invoice.id });
  }
}

/**
 * Borra el borrador vacío. Con la clave de idempotencia, un reintento
 * recibe el mismo borrador ya borrado: no es un error.
 */
async function deleteEmptyDraft(providerId: string, invoice: Stripe.Invoice): Promise<void> {
  if (invoice.status !== 'draft' || !invoice.id) return;
  try {
    await getStripeClient().invoices.del(invoice.id, {}, { timeout: STRIPE_TIMEOUT_MS });
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    if (code === 'resource_missing') return;
    reportBillingIssue(err, providerId, { emptyDraftInvoiceId: invoice.id });
  }
}
