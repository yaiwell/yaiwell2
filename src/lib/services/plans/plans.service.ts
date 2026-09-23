import 'server-only';

import { PlansNotSeededError } from './plans.errors';
import { plansRepository } from './plans.repository';
import { isPlanTierId, type PublicPlan } from './plans.types';

/**
 * Devuelve el catálogo de planes tal y como debe publicarse.
 *
 * Es la única puerta por la que la landing `/profesionales` obtiene
 * comisiones y cuotas. Antes esas cifras vivían en un array dentro de
 * `ForProvidersPricing.tsx` y divergieron del seed: publicábamos 9/6/4 %
 * mientras Stripe cobraba 10/8/6 %. Con la lectura de BD la divergencia
 * deja de ser posible.
 *
 * @returns los planes ordenados por cuota mensual ascendente.
 * @throws PlansNotSeededError si la tabla está vacía — el caller decide
 *   cómo degradar, pero nunca sustituyendo por valores hardcodeados.
 */
export async function listPublicPlans(): Promise<PublicPlan[]> {
  const rows = await plansRepository.findAllOrderedByPrice();

  if (rows.length === 0) {
    throw new PlansNotSeededError();
  }

  // Filtramos tiers desconocidos en lugar de castear: si algún día se
  // añade un tier en BD sin actualizar `PLAN_TIERS`, preferimos no
  // pintarlo (la UI no sabría ni su nombre ni sus features) antes que
  // reventar la landing entera.
  return rows
    .filter((row) => isPlanTierId(row.tier))
    .map((row) => ({
      tier: row.tier,
      monthlyPriceCents: row.monthlyPriceCents,
      commissionRateBps: row.commissionRateBps,
      maxServices: row.maxServices,
    }));
}
