import { z } from 'zod';

import { routing } from '@/i18n/routing';
import { PLAN_TIERS, type PlanTierId } from '@/lib/services/plans';

/**
 * Plan preseleccionado en `/hazte-profesional?plan=…` o en la llamada a
 * `becomeProviderAction`. Viene de fuera (URL o navegador): un valor
 * desconocido no rompe nada, se descarta y el wizard empieza en Gratis.
 */
const planSchema = z.enum(PLAN_TIERS).nullish().catch(null);

/**
 * Entrada de la server action `becomeProviderAction`.
 *
 * El locale sí se exige válido (acaba en `revalidatePath`); el plan se
 * ignora si no es uno del catálogo, porque solo es una preferencia.
 */
export const becomeProviderInputSchema = z.object({
  locale: z.enum(routing.locales),
  plan: planSchema,
});

/**
 * Extrae el plan de un searchParam crudo.
 *
 * @param raw — valor del parámetro `plan` (string, array o ausente).
 * @returns el tier si es válido, o `null`.
 */
export function parseBecomeProviderPlan(raw: unknown): PlanTierId | null {
  return planSchema.parse(raw) ?? null;
}
