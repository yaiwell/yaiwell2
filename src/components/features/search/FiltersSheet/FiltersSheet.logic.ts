'use client';

import { useCallback, useState } from 'react';

import type { PriceRange } from '@/types/domain';

import type { AdvancedFiltersValue } from './FiltersSheet.types';

/**
 * Hook que gestiona el borrador local del sheet.
 *
 * El sheet edita un borrador (`draft`) y solo emite hacia el padre
 * cuando el usuario pulsa "Aplicar". Si cancela cerrando, el borrador
 * se descarta y al reabrir vuelve al estado del padre.
 *
 * Sincronizamos `draft` con `initial` cuando el sheet se abre usando
 * el patrón de "derived state durante el render" recomendado por
 * React 19, evitando `useEffect` (penalizado por
 * `react-hooks/set-state-in-effect`).
 */
export function useFiltersSheet(
  initial: AdvancedFiltersValue,
  open: boolean,
  onApply: (next: AdvancedFiltersValue) => void,
) {
  const [draft, setDraft] = useState<AdvancedFiltersValue>(initial);
  const [wasOpen, setWasOpen] = useState(open);

  // Detectamos la transición closed → open y restablecemos el draft
  // con el valor "fuente de verdad" del padre.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(initial);
  }

  const togglePrice = useCallback((range: PriceRange) => {
    setDraft((prev) => {
      const exists = prev.priceRange.includes(range);
      return {
        ...prev,
        priceRange: exists
          ? prev.priceRange.filter((r) => r !== range)
          : [...prev.priceRange, range],
      };
    });
  }, []);

  const setRating = useCallback((rating: number | null) => {
    setDraft((prev) => ({ ...prev, minRating: rating }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(draft);
  }, [draft, onApply]);

  return {
    draft,
    togglePrice,
    setRating,
    handleApply,
  };
}
