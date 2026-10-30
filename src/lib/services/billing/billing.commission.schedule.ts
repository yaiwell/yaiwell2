import 'server-only';

import { after } from 'next/server';

import { itemizeCommission } from './billing.commission.itemize';
import { reportBillingIssue } from './billing.report';

/**
 * Programa el paso a Stripe de una comisión para **después** de responder
 * (`after`), fuera de la transacción que completó la reserva. Es lo que
 * llaman las actions del panel tras `markBookingCompleted` o
 * `undoBookingNoShow` con su `onsiteCommissionChargeId`.
 *
 * Nunca lanza: la reserva ya está completada y la fila queda en
 * `pending`; si esto falla (o ni siquiera se programa), el cron diario la
 * reintenta.
 *
 * @param chargeId — id devuelto por el dominio booking; `null` (reserva
 *   online) no hace nada, para que el caller no tenga que comprobarlo.
 */
export function scheduleCommissionItemization(chargeId: string | null | undefined): void {
  if (!chargeId) return;
  try {
    after(async () => {
      try {
        await itemizeCommission(chargeId);
      } catch (err) {
        reportBillingIssue(err, 'unknown', { onsiteCommissionChargeId: chargeId });
      }
    });
  } catch (err) {
    // Fuera de una petición `after` lanza: lo recoge el cron.
    console.error('[billing] could not schedule commission itemization:', chargeId, err);
  }
}
