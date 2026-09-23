import { z } from 'zod';

import { PLAN_TIERS, type PlanTierId } from '@/lib/services/plans';

/**
 * Validación de los searchParams con los que `/profesionales` empuja
 * al alta (`/registro?as=provider&plan=pro`).
 *
 * Vienen de la URL, o sea de fuera: cualquiera puede escribir
 * `?as=admin`. Por eso los pasamos por Zod antes de tocar el estado
 * del formulario. Usamos `.catch(undefined)` en vez de lanzar porque
 * un parámetro basura no debe romper una página pública de captación:
 * se ignora y el formulario arranca en su estado por defecto.
 *
 * Nota: si el parámetro llega repetido (`?as=a&as=b`), Next lo entrega
 * como array; el enum falla y el `.catch` lo descarta. Es el
 * comportamiento que queremos.
 */
export const signUpSearchParamsSchema = z.object({
  // Solo los dos roles que el formulario ofrece. `admin` no se
  // autoasigna nunca desde una URL.
  as: z.enum(['client', 'provider']).optional().catch(undefined),
  // Los tiers reales del catálogo (`PlanTier` en BD).
  plan: z.enum(PLAN_TIERS).optional().catch(undefined),
});

/** Intención de alta extraída de la URL, ya saneada. */
export interface SignUpIntent {
  role: 'client' | 'provider' | undefined;
  plan: PlanTierId | undefined;
}

/**
 * Extrae rol y plan preseleccionados de unos searchParams ya resueltos.
 *
 * @param raw — objeto de searchParams de Next 16 (ya `await`-eado).
 * @returns la intención saneada; ambos campos son `undefined` si el
 *   parámetro falta o no es válido.
 */
export function parseSignUpIntent(raw: unknown): SignUpIntent {
  const parsed = signUpSearchParamsSchema.safeParse(raw ?? {});

  // `safeParse` solo puede fallar si `raw` no es un objeto: los campos
  // inválidos ya los neutraliza el `.catch` de cada uno.
  if (!parsed.success) {
    return { role: undefined, plan: undefined };
  }

  return { role: parsed.data.as, plan: parsed.data.plan };
}
