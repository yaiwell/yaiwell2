/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca' | 'en' | 'de';

/** Periodo de filtrado por antigüedad. */
export type ReviewPeriod = '7d' | '30d' | '90d' | 'all';

/** Filtro por número de estrellas (`null` = todas). */
export type ReviewStarsFilter = 1 | 2 | 3 | 4 | 5 | null;

/** Estado controlado de los filtros del listado de reseñas. */
export interface ReviewsFilterState {
  stars: ReviewStarsFilter;
  period: ReviewPeriod;
  withoutResponseOnly: boolean;
}

/** Respuesta del proveedor a una reseña. */
export interface PanelReviewResponse {
  text: string;
  /** Fecha en que el proveedor publicó la respuesta. */
  respondedAt: Date;
}

/**
 * Reseña enriquecida tal como se muestra en el panel del proveedor.
 *
 * View-model plano: la página servidora resuelve los joins (author,
 * booking → service) y entrega `authorName` y `serviceName` ya
 * desnormalizados en strings.
 */
export interface PanelReview {
  id: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  serviceName: string;
  createdAt: Date;
  /** Respuesta del proveedor (si ya ha contestado). */
  providerResponse: PanelReviewResponse | null;
}

/** Props del componente ReceivedReviews. */
export interface ReceivedReviewsProps {
  reviews: PanelReview[];
  locale: SupportedLocale;
}
