import type { ActiveFilterChip, ActiveFiltersState } from './ActiveFiltersChips.types';

/**
 * Convierte el estado plano de filtros en una lista ordenada de chips.
 *
 * Orden estable (texto → categoría → disponibilidad → precios → rating)
 * para que añadir/quitar un filtro no reordene los chips ya pintados,
 * lo que sería disruptivo visualmente.
 */
export function buildActiveFilterChips(
  filters: ActiveFiltersState,
  categoryLabel: string | null,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.query.trim().length > 0) {
    chips.push({ kind: 'query', value: filters.query.trim() });
  }

  if (filters.categorySlug && categoryLabel) {
    chips.push({ kind: 'category', slug: filters.categorySlug, label: categoryLabel });
  }

  if (filters.availabilityOnly) {
    chips.push({ kind: 'availability' });
  }

  for (const price of filters.priceRange) {
    chips.push({ kind: 'price', value: price });
  }

  if (filters.minRating !== null) {
    chips.push({ kind: 'rating', value: filters.minRating });
  }

  return chips;
}
