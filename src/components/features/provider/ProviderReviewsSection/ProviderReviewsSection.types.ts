/**
 * Tipos específicos del componente ProviderReviewsSection.
 *
 * El tipo `Review` lo importamos del dominio para no duplicar la
 * fuente de verdad. El breakdown lo modelamos aquí porque solo es
 * relevante para la presentación: la BD no lo almacena, se calcula.
 */

import type { Review } from '@/types/domain';

/**
 * Reparto de notas: cuántas reseñas hay por cada nota entera 1-5.
 * Las claves son números literales para que TypeScript fuerce que
 * estén las 5 entradas y no se nos pase ninguna.
 */
export interface RatingBreakdown {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/**
 * Props del componente ProviderReviewsSection.
 * Recibe ya calculados tanto la nota media como el desglose; el
 * componente solo se preocupa de presentar.
 */
export interface ProviderReviewsSectionProps {
  reviews: Review[];
  ratingAvg: number;
  reviewsCount: number;
  ratingBreakdown: RatingBreakdown;
  locale: 'es' | 'ca';
}
