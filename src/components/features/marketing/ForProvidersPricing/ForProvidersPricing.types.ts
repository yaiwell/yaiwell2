/**
 * Identificador estable de cada plan. Coincide con el query string
 * `?plan=` que pasaremos a `/registro` y con la futura tabla `Plan`
 * (ver CLAUDE.md §4 y §10).
 */
export type PricingPlanId = 'free' | 'basic' | 'pro' | 'premium';

export interface PricingPlan {
  id: PricingPlanId;
  /** Precio mensual en euros, mostrado al usuario. */
  priceEur: number;
  /** Comisión sobre cada reserva, mostrada como `12%`. */
  commission: string;
  /** Si `true`, la card se resalta con borde primario y badge. */
  popular: boolean;
  /** Claves i18n usadas para las 4 features visibles en cada card. */
  featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'];
}
