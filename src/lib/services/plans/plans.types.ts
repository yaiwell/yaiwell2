/**
 * Tipos del dominio `plans` (catálogo comercial de suscripciones).
 *
 * La tabla `Plan` es la única fuente de verdad de las cifras: la
 * comisión que Stripe cobra como `application_fee_amount` sale de
 * `commissionRateBps` y la cuota mensual de `monthlyPriceCents`.
 * Publicar esos números desde otro sitio (un array en un componente,
 * por ejemplo) reintroduce la divergencia que este módulo existe para
 * eliminar.
 */

/**
 * Tiers del catálogo, en orden comercial ascendente.
 *
 * Espeja el enum `PlanTier` de Prisma. Lo declaramos aquí como tupla
 * `as const` en vez de importar el enum generado porque este union
 * viaja hasta la UI (props de componentes, query string `?plan=`) y
 * no queremos arrastrar `@prisma/client` a esos bordes.
 */
export const PLAN_TIERS = ['free', 'basic', 'pro', 'premium'] as const;

/** Identificador estable de plan. Coincide con `?plan=` en las URLs. */
export type PlanTierId = (typeof PLAN_TIERS)[number];

/**
 * Proyección pública de un plan: solo lo que la landing comercial
 * necesita pintar. No exponemos `id` (uuid interno) ni los ids de
 * Stripe: una página pública no tiene por qué conocerlos.
 */
export interface PublicPlan {
  tier: PlanTierId;
  /** Cuota mensual en céntimos de euro (0 = plan gratuito). */
  monthlyPriceCents: number;
  /** Comisión por reserva en basis points (1000 = 10,00 %). */
  commissionRateBps: number;
  /** Límite de servicios publicables. */
  maxServices: number;
}

/**
 * Type guard para el `tier` que llega de BD o de la URL.
 *
 * Aunque en BD sea un enum cerrado, el valor cruza la frontera como
 * string; validarlo aquí evita castings ciegos en el resto del módulo.
 */
export function isPlanTierId(value: unknown): value is PlanTierId {
  return typeof value === 'string' && (PLAN_TIERS as readonly string[]).includes(value);
}
