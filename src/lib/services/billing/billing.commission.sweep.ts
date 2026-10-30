import 'server-only';

import { findProvidersToInvoice, invoiceProviderCommissions } from './billing.commission.invoice';
import { itemizeCommissionAt } from './billing.commission.itemize';
import { commissionRepository } from './billing.commission.repository';
import type { CommissionSweepSummary } from './billing.types';

/** Comisiones `pending` (atrasadas) que se reintentan como mucho por pasada. */
export const MAX_PENDING_RETRIES_PER_RUN = 50;

/** Facturas mensuales que se emiten como mucho por pasada. */
export const MAX_INVOICES_PER_RUN = 25;

/** Opciones de una pasada del barrido. */
export interface CommissionSweepOptions {
  now: Date;
  /** Instante (ms epoch) a partir del cual no se empieza nada nuevo. */
  deadline: number;
  /** Comisiones recién encoladas por el cierre automático: van primero. */
  freshChargeIds?: string[];
}

/**
 * Barrido diario de comisiones del pago en el local (lo llama el cron):
 *
 *  a) pasa a Stripe las comisiones recién encoladas y reintenta las que
 *     siguen `pending` (Stripe falló o la action no llegó a programarlo);
 *  b) emite la factura mensual suelta de los negocios sin suscripción
 *     viva que aún no la tienen este mes (hora de Madrid).
 *
 * En serie y con presupuesto de tiempo: antes de cada llamada se mira el
 * reloj y, si se ha pasado `deadline`, se deja para mañana (`truncated`).
 * Ninguna llamada a Stripe lanza (cada paso registra su fallo), así que un
 * negocio con problemas no frena a los demás.
 *
 * @throws solo si falla la BD en las consultas de lista.
 */
export async function runCommissionSweep(
  options: CommissionSweepOptions,
): Promise<CommissionSweepSummary> {
  const { now, deadline } = options;
  const summary: CommissionSweepSummary = {
    itemized: 0,
    retryLater: 0,
    invoiced: 0,
    emptyInvoices: 0,
    invoiceFailures: 0,
    truncated: false,
  };
  const outOfTime = () => Date.now() >= deadline;

  const fresh = options.freshChargeIds ?? [];
  const backlog = await findPendingIds(fresh);
  for (const chargeId of [...fresh, ...backlog]) {
    if (outOfTime()) {
      summary.truncated = true;
      return summary;
    }
    const outcome = await itemizeOrRetryLater(chargeId, now);
    if (outcome === 'itemized') summary.itemized++;
    if (outcome === 'retry_later') summary.retryLater++;
  }

  if (outOfTime()) {
    summary.truncated = true;
    return summary;
  }
  const targets = await findProvidersToInvoice(now, MAX_INVOICES_PER_RUN);
  for (const target of targets) {
    if (outOfTime()) {
      summary.truncated = true;
      break;
    }
    const outcome = await invoiceProviderCommissions(target, now);
    if (outcome === 'invoiced') summary.invoiced++;
    if (outcome === 'empty') summary.emptyInvoices++;
    if (outcome === 'failed') summary.invoiceFailures++;
  }
  return summary;
}

async function findPendingIds(exclude: string[]): Promise<string[]> {
  return commissionRepository.findPendingChargeIds(MAX_PENDING_RETRIES_PER_RUN, exclude);
}

/** Un fallo de BD en una fila no corta el barrido: se reintenta mañana. */
async function itemizeOrRetryLater(chargeId: string, now: Date) {
  try {
    return await itemizeCommissionAt(chargeId, now);
  } catch (err) {
    console.error('[billing] commission itemization failed:', chargeId, err);
    return 'retry_later' as const;
  }
}
