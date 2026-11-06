'use client';

import { useCallback } from 'react';

import type { PriceRange } from '@/types/domain';

import type { ActiveFilterChip } from '../ActiveFiltersChips';
import type { SearchFilters } from './SearchView.types';

/**
 * Handlers de los chips de filtros activos.
 *
 * Separados del orquestador para mantener `SearchView.logic.ts` por
 * debajo del límite de 250 líneas (§6.bis). Reciben `updateFilters` ya
 * construido, así que heredan gratis la conservación de `?near=me`.
 *
 * @param priceRange — rangos de precio activos (para quitar uno solo).
 * @param days — días elegidos (para quitar uno solo).
 * @param updateFilters — aplica un patch parcial y navega.
 */
export function useFilterChipHandlers(
  priceRange: PriceRange[],
  days: string[],
  updateFilters: (patch: Partial<SearchFilters>) => void,
) {
  /**
   * Elimina un chip concreto sin tocar el resto. El switch garantiza
   * que el TypeScript chequee todos los casos del discriminated union.
   */
  const handleRemoveChip = useCallback(
    (chip: ActiveFilterChip) => {
      switch (chip.kind) {
        case 'query':
          updateFilters({ query: '' });
          return;
        case 'category':
          updateFilters({ categorySlug: null });
          return;
        case 'availability':
          updateFilters({ availabilityOnly: false });
          return;
        case 'discount':
          updateFilters({ discountOnly: false });
          return;
        case 'when':
          updateFilters({ when: null });
          return;
        case 'day':
          updateFilters({ days: days.filter((day) => day !== chip.value) });
          return;
        case 'price':
          updateFilters({
            priceRange: priceRange.filter((p) => p !== chip.value),
          });
          return;
        case 'rating':
          updateFilters({ minRating: null });
          return;
      }
    },
    [priceRange, days, updateFilters],
  );

  const handleClearAllChips = useCallback(() => {
    updateFilters({
      query: '',
      categorySlug: null,
      availabilityOnly: false,
      discountOnly: false,
      when: null,
      days: [],
      priceRange: [] as PriceRange[],
      minRating: null,
    });
  }, [updateFilters]);

  return { handleRemoveChip, handleClearAllChips };
}
