import 'server-only';

import { commissionRepository } from './billing.commission.repository';
import { BillingProviderNotFoundError } from './billing.errors';
import {
  OnsiteCommissionDebtError,
  OnsitePaymentMethodMissingError,
} from './billing.onsite.errors';
import type { OnsiteBillingSummary, OnsitePaymentBlockReason } from './billing.types';

/**
 * Datos de la tarjeta «Cobro en el local» de `/panel/plan`. Solo lee BD:
 * el método de pago y la deuda los mantienen el webhook y el Checkout de
 * setup.
 *
 * @param providerId — negocio (ya autorizado por el caller).
 * @throws BillingProviderNotFoundError — si el negocio no existe.
 */
export async function getOnsiteBillingSummary(providerId: string): Promise<OnsiteBillingSummary> {
  const { provider, totals } = await commissionRepository.findOnsiteSummaryRows(providerId);
  if (!provider) throw new BillingProviderNotFoundError();

  const readyAt = provider.billing?.onsitePaymentMethodReadyAt ?? null;
  const debtSince = provider.billing?.commissionDebtSince ?? null;
  const blockedBy = blockReason(readyAt, debtSince);
  const sum = (statuses: string[]) =>
    totals
      .filter((row) => statuses.includes(row.status))
      .reduce((acc, row) => acc + (row._sum.amountCents ?? 0), 0);

  return {
    enabled: provider.acceptsOnsitePayment,
    effective: provider.acceptsOnsitePayment && blockedBy === null,
    paymentMethodReady: readyAt !== null,
    paymentMethodReadyAt: readyAt,
    commissionDebtSince: debtSince,
    enableBlockedBy: blockedBy,
    outstandingCommissionCents: sum(['pending', 'itemized', 'invoiced']),
    overdueCommissionCents: sum(['failed']),
  };
}

/**
 * Activa o desactiva el pago en el local del negocio (opt-in, §4.bis).
 *
 * Desactivar siempre se puede. Activar exige método de pago guardado y
 * ninguna comisión impagada; la condición se comprueba en el mismo
 * `UPDATE` para que un impago simultáneo no se cuele. Las reservas en el
 * local ya hechas no se tocan: el interruptor solo afecta a las nuevas.
 *
 * @throws OnsitePaymentMethodMissingError | OnsiteCommissionDebtError
 *   | BillingProviderNotFoundError
 */
export async function setOnsitePaymentAcceptance(
  providerId: string,
  enabled: boolean,
): Promise<void> {
  if (!enabled) {
    if (!(await commissionRepository.disableOnsitePayment(providerId))) {
      throw new BillingProviderNotFoundError();
    }
    return;
  }
  if (await commissionRepository.enableOnsitePayment(providerId)) return;

  // No se activó: averiguamos por qué para que la UI lo explique.
  const { provider } = await commissionRepository.findOnsiteSummaryRows(providerId);
  if (!provider) throw new BillingProviderNotFoundError();
  const reason = blockReason(
    provider.billing?.onsitePaymentMethodReadyAt ?? null,
    provider.billing?.commissionDebtSince ?? null,
  );
  if (reason === 'commission_debt') throw new OnsiteCommissionDebtError();
  throw new OnsitePaymentMethodMissingError();
}

/** La deuda manda sobre el método: con deuda no basta con añadir tarjeta. */
function blockReason(
  readyAt: Date | null,
  debtSince: Date | null,
): OnsitePaymentBlockReason | null {
  if (debtSince) return 'commission_debt';
  if (!readyAt) return 'payment_method_missing';
  return null;
}
