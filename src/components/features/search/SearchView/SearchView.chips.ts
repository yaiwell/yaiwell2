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
 * @param updateFilters — aplica un patch parcial y navega.
 */
export function useFilterChipHandlers(
  priceRange: PriceRange[],
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
    [priceRange, updateFilters],
  );

  const handleClearAllChips = useCallback(() => {
    updateFilters({
      query: '',
      categorySlug: null,
      availabilityOnly: false,
      priceRange: [] as PriceRange[],
      minRating: null,
    });
  }, [updateFilters]);

  return { handleRemoveChip, handleClearAllChips };
}
