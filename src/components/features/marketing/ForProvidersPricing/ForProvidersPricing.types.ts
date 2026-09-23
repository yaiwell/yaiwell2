/**
 * Tipos específicos del componente ForProvidersPricing.
 *
 * Las cifras (comisión y cuota) NO viven aquí: llegan como props desde
 * la page, que las pide al módulo `plans`. Aquí solo queda lo que es
 * presentación pura: qué card se destaca y qué claves i18n usa.
 */

import type { PlanTierId, PublicPlan } from '@/lib/services/plans';

/**
 * Identificador estable de cada plan. Alias del tier canónico del
 * dominio para no duplicar el union; se mantiene el nombre porque el
 * barrel de `marketing` ya lo exporta con él.
 */
export type PricingPlanId = PlanTierId;

/** Claves i18n de las 4 features visibles en cada card. */
export type PricingFeatureKeys = readonly ['feature1', 'feature2', 'feature3', 'feature4'];

/**
 * Metadatos de presentación de un plan. Es lo único que sigue siendo
 * decisión de marketing y no dato de negocio.
 */
export interface PricingPlanPresentation {
  /** Si `true`, la card se resalta con borde primario y badge. */
  popular: boolean;
  featureKeys: PricingFeatureKeys;
}

export interface ForProvidersPricingProps {
  /**
   * Planes reales leídos de la tabla `Plan`, ya ordenados por cuota.
   * Si llega vacío el componente no pinta nada: preferimos ocultar la
   * sección a publicar una tarifa inventada.
   */
  plans: PublicPlan[];
}
