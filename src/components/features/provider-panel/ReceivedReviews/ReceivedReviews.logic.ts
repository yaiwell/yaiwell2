'use client';

import { useMemo, useState } from 'react';

import type { PanelReview, ReviewPeriod, ReviewsFilterState } from './ReceivedReviews.types';

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
 * Calcula la nota media (1 decimal) de un conjunto de reseñas.
 * Devuelve 0 si el array está vacío para que la UI pueda mostrar un
 * fallback sin condicionales extra.
 */
export function computeAverageRating(reviews: PanelReview[]): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
