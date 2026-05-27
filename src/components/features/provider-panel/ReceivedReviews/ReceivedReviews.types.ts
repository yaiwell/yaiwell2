import type { PanelReview } from '@/lib/fake-data/panel-reviews';

/** Locales soportados en la UI del panel. */
export type SupportedLocale = 'es' | 'ca';

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

/** Props del componente ReceivedReviews. */
export interface ReceivedReviewsProps {
  reviews: PanelReview[];
  locale: SupportedLocale;
}
