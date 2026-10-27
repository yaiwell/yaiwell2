/**
 * Tipos específicos del componente RatingSummary.
 *
 * Recibe los dos campos de la caché de valoraciones del proveedor
 * (`Provider.rating` / `Provider.reviewsCount` en `/types/domain.ts`)
 * como números sueltos para no acoplarse al shape del dominio.
 */

/**
 * Contexto visual donde se pinta la valoración: cabecera de la ficha,
 * card del listado o popup del mapa. Cada uno tiene su escala tipográfica.
 */
export type RatingSummaryVariant = 'header' | 'card' | 'popup';

export interface RatingSummaryProps {
  /** Media cacheada (1-5, 1 decimal). Se ignora si no hay reseñas. */
  ratingAvg: number;
  /** Número de reseñas cacheado. `0` → «Nuevo en Yaiwell». */
  reviewsCount: number;
  /** Escala visual. Por defecto `card`. */
  variant?: RatingSummaryVariant;
  /** Valor del atributo `data-component`, usado por los tests E2E. */
  dataComponent?: string;
}

export type { RatingDisplay } from '@/lib/utils/rating';
