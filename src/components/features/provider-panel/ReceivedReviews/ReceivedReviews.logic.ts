'use client';

import { useMemo, useState } from 'react';

import { formatRatingValue, getRatingDisplay, roundRatingAverage } from '@/lib/utils/rating';

import type {
  PanelReview,
  ReviewPeriod,
  ReviewsFilterState,
  SupportedLocale,
} from './ReceivedReviews.types';

/** Estado inicial: sin filtros, periodo amplio. */
const INITIAL_FILTERS: ReviewsFilterState = {
  stars: null,
  period: 'all',
  withoutResponseOnly: false,
};

/** Días de antigüedad asociados a cada periodo. */
const PERIOD_DAYS: Record<ReviewPeriod, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

/**
 * Hook que centraliza el estado de filtros del listado y aplica el
 * filtrado al array recibido.
 *
 * El filtrado se memoriza con `useMemo` para evitar recomputar el array
 * en cada render cuando solo cambia algo no relacionado.
 */
export function useReviewsFilters(reviews: PanelReview[]) {
  const [filters, setFilters] = useState<ReviewsFilterState>(INITIAL_FILTERS);
  // Anclamos "ahora" al primer render para que el filtrado por periodo
  // sea estable mientras dure la sesión del componente y no dependa de
  // `Date.now()` impuro durante el render (regla react-hooks/purity).
  const [nowMs] = useState<number>(() => Date.now());

  const filteredReviews = useMemo(() => {
    const periodDays = PERIOD_DAYS[filters.period];
    const cutoff = periodDays !== null ? nowMs - periodDays * 24 * 60 * 60 * 1000 : null;

    return reviews.filter((review) => {
      if (filters.stars !== null && review.rating !== filters.stars) return false;
      if (cutoff !== null && review.createdAt.getTime() < cutoff) return false;
      if (filters.withoutResponseOnly && review.providerResponse !== null) return false;
      return true;
    });
  }, [reviews, filters, nowMs]);

  return { filters, setFilters, filteredReviews };
}

/**
 * Resumen «4,6 sobre 5 · 12 valoraciones» de la cabecera del panel.
 *
 * Usa la misma regla y el mismo redondeo que la ficha pública
 * (`@/lib/utils/rating`, mitad hacia arriba como el trigger SQL), así el
 * dueño ve en su panel la nota que ven sus clientes.
 *
 * Sin reseñas devuelve `null` y el panel oculta el resumen: el empty
 * state del listado ya dice que aún no hay valoraciones, y «0 sobre 5»
 * se lee como una nota pésima, no como un centro recién llegado.
 *
 * @param reviews — todas las reseñas del centro (sin filtrar).
 * @param locale — locale activo, para la coma o el punto decimal.
 * @returns nota formateada y contador, o `null` si no hay nota.
 */
export function getPanelRatingSummary(
  reviews: PanelReview[],
  locale: SupportedLocale,
): { rating: string; count: number } | null {
  const average = roundRatingAverage(reviews.map((r) => r.rating));
  const display = getRatingDisplay(average, reviews.length);
  if (display.kind === 'new') return null;
  return { rating: formatRatingValue(display.value, locale), count: display.count };
}
