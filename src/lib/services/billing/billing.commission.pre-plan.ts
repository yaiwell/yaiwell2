import 'server-only';

import { getStripeClient } from '@/lib/integrations/stripe';

import {
  createCommissionInvoiceDraft,
  finalizeCommissionInvoice,
} from './billing.commission.issue';
import { BillingProviderNotFoundError, BillingStripeError } from './billing.errors';
import { billingRepository } from './billing.repository';

/** Desenlace de facturar las comisiones pendientes antes de un plan. */
export type PrePlanCommissionOutcome = 'none' | 'invoiced' | 'empty';

/**
 * Factura aparte las comisiones pendientes del Customer **antes** de abrir
 * el Checkout de un plan.
 *
 * Por qué: Stripe mete los conceptos pendientes del Customer en la primera
 * factura de una suscripción nueva, y Checkout solo enseña el precio del
 * plan. Sin esto, contratar un plan cobraría comisiones que el negocio no
 * ha visto en la página de pago.
 *
 * Se mira en Stripe (conceptos `pending` del Customer), no en BD: cubre
 * también un concepto creado cuya fila no llegó a guardarse.
 *
 * Clave por negocio y minuto: un doble clic recibe la misma factura; un
 * intento posterior crea un borrador vacío (los conceptos ya están en la
 * anterior) que se borra.
 *
 * @throws BillingStripeError — si no se puede comprobar o facturar: el
 *   caller NO debe abrir el Checkout (cobraría comisiones sin enseñarlas).
 * @throws BillingProviderNotFoundError — si el negocio no existe.
 */
export async function invoiceCommissionsBeforePlan(
  providerId: string,
  customerId: string,
  now: Date = new Date(),
): Promise<PrePlanCommissionOutcome> {
  let hasPending: boolean;
  try {
    const pending = await getStripeClient().invoiceItems.list({
      customer: customerId,
      pending: true,
      limit: 1,
    });
    hasPending = pending.data.length > 0;
  } catch (err) {
    throw new BillingStripeError('Could not list pending invoice items.', err);
  }
  if (!hasPending) return 'none';

  const provider = await billingRepository.findProviderForBilling(providerId);
  if (!provider) throw new BillingProviderNotFoundError();

  const minute = Math.floor(now.getTime() / 60_000);
  let invoice;
  try {
    invoice = await createCommissionInvoiceDraft({
      providerId,
      customerId,
      locale: provider.ownerLocale,
      idempotencyKey: `onsite-commission-invoice:${providerId}:pre-plan:${minute}`,
      metadata: { reason: 'before_plan_checkout' },
    });
  } catch (err) {
    throw new BillingStripeError('Could not invoice pending commissions before the plan.', err);
  }
  if (!invoice) return 'empty';
  await finalizeCommissionInvoice(providerId, invoice);
  return 'invoiced';
}
