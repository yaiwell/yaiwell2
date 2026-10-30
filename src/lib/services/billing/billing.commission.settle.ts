import 'server-only';

import { getStripeClient } from '@/lib/integrations/stripe';

import { commissionRepository } from './billing.commission.repository';
import { applyCommissionInvoiceEvent } from './billing.commission.webhook';
import { reportBillingIssue } from './billing.report';

/** Tope por cobro: corre dentro del webhook o de la página de vuelta. */
const STRIPE_TIMEOUT_MS = 10_000;

/** Resultado de intentar saldar la deuda con el método nuevo. */
export interface SettleCommissionDebtResult {
  attempted: number;
  paid: number;
}

/**
 * Intenta cobrar ya, con el método de pago recién guardado, las facturas
 * de comisiones sin cobrar del negocio, para levantar la suspensión del
 * pago en el local sin esperar a los reintentos de Stripe.
 *
 * Idempotente por factura y método (`invoices.pay` con clave). Si una
 * factura se cobra, se aplica el `invoice.paid` en el acto (limpia la
 * deuda si no queda nada fallido); el webhook que llegue después no
 * cambia nada. **Nunca lanza**: si un cobro falla, todo sigue como estaba
 * y Stripe lo reintentará con el método por defecto nuevo.
 *
 * @param paymentMethodId — método recién guardado con el Checkout de setup.
 */
export async function settleCommissionDebt(
  providerId: string,
  paymentMethodId: string,
  now: Date = new Date(),
): Promise<SettleCommissionDebtResult> {
  const result: SettleCommissionDebtResult = { attempted: 0, paid: 0 };
  let invoiceIds: string[];
  try {
    invoiceIds = await commissionRepository.findUnpaidCommissionInvoiceIds(providerId);
  } catch (err) {
    reportBillingIssue(err, providerId, { step: 'settle_commission_debt' });
    return result;
  }

  for (const invoiceId of invoiceIds) {
    result.attempted++;
    try {
      const invoice = await getStripeClient().invoices.pay(
        invoiceId,
        { payment_method: paymentMethodId },
        {
          idempotencyKey: `onsite-commission-pay:${invoiceId}:${paymentMethodId}`,
          timeout: STRIPE_TIMEOUT_MS,
        },
      );
      if (invoice.status !== 'paid') continue;
      result.paid++;
      await applyCommissionInvoiceEvent('invoice.paid', invoice, now);
    } catch (err) {
      // Tarjeta rechazada, factura ya cobrada o anulada, BD caída: la
      // deuda sigue como estaba y la resuelven los reintentos o el webhook.
      reportBillingIssue(err, providerId, { stripeInvoiceId: invoiceId });
    }
  }
  return result;
}
