import 'server-only';

import type Stripe from 'stripe';

import type { AppLocale } from '@/i18n/routing';

import {
  createCommissionInvoiceDraft,
  finalizeCommissionInvoice,
} from './billing.commission.issue';
import {
  commissionInvoiceIdempotencyKey,
  getMadridPeriod,
  getMadridPeriodStart,
} from './billing.commission.period';
import { commissionRepository } from './billing.commission.repository';
import { reportBillingIssue } from './billing.report';

/** Desenlace de la factura mensual de un negocio. */
export type CommissionInvoiceOutcome = 'invoiced' | 'empty' | 'failed';

/** Negocio al que toca facturar (fila de `findProvidersToInvoice`). */
export interface ProviderToInvoice {
  providerId: string;
  stripeCustomerId: string;
  provider: { owner: { locale: AppLocale } };
}

/**
 * Lista los negocios a los que toca emitir la factura suelta de
 * comisiones de este periodo (mes de Madrid de `now`).
 */
export async function findProvidersToInvoice(now: Date, limit: number) {
  return commissionRepository.findProvidersToInvoice(
    getMadridPeriod(now),
    getMadridPeriodStart(now),
    limit,
  );
}

/**
 * Emite la factura mensual suelta de comisiones de un negocio **sin
 * suscripción viva** (con suscripción, los conceptos entran solos en su
 * factura de renovación).
 *
 * `pending_invoice_items_behavior: 'include'` recoge todos los conceptos
 * pendientes del Customer. Se cobra sola con el método por defecto del
 * Customer (`charge_automatically`, guardado con el Checkout de setup) y
 * Stripe la reintenta según los ajustes de reintentos del Dashboard.
 *
 * Orden y por qué:
 *  1. `invoices.create` con clave por negocio y mes: dos ejecuciones del
 *     cron reciben la misma factura.
 *  2. Borrador vacío (los conceptos ya entraron en otra factura) → se
 *     borra; se apunta el periodo igualmente para no repetirlo cada día.
 *  3. Se apunta el periodo **antes** de finalizar: si finalizar falla,
 *     `auto_advance` la finaliza sola en ~1 h y no se crea otra.
 *  4. `finalizeInvoice` para que el cobro salga ya y no en una hora.
 *
 * Nunca lanza por Stripe: reporta y devuelve `failed` (el periodo sigue
 * sin apuntar y lo reintenta el cron del día siguiente).
 *
 * @param target — negocio y Customer.
 * @param now — instante de referencia (decide el periodo).
 */
export async function invoiceProviderCommissions(
  target: ProviderToInvoice,
  now: Date,
): Promise<CommissionInvoiceOutcome> {
  const period = getMadridPeriod(now);
  let invoice: Stripe.Invoice | null;
  try {
    invoice = await createCommissionInvoiceDraft({
      providerId: target.providerId,
      customerId: target.stripeCustomerId,
      locale: target.provider.owner.locale,
      idempotencyKey: commissionInvoiceIdempotencyKey(target.providerId, period),
      metadata: { period },
    });
  } catch (err) {
    reportBillingIssue(err, target.providerId, { commissionInvoicePeriod: period });
    return 'failed';
  }

  await commissionRepository.markInvoicePeriod(target.providerId, period);
  if (!invoice) return 'empty';
  await finalizeCommissionInvoice(target.providerId, invoice);
  return 'invoiced';
}
