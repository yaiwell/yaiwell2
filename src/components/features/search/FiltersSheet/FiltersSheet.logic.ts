'use client';

import { useCallback, useState } from 'react';

import type { PriceRange } from '@/types/domain';

import type { AdvancedFiltersValue, ClearAdvancedOptions } from './FiltersSheet.types';

/**
 * Breakpoint `md` de Tailwind: desde aquí "Con descuento" está en la
 * barra y el sheet no lo enseña.
 */
const DISCOUNT_IN_BAR_QUERY = '(min-width: 768px)';

/**
 * Indica si el filtro "Con descuento" está a la vista dentro del sheet.
 *
 * Se consulta en el momento del clic (no en render), así que no hay
 * problema de SSR ni de hidratación.
 */
export function isDiscountShownInSheet(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia(DISCOUNT_IN_BAR_QUERY).matches;
}

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
  onClear: (options: ClearAdvancedOptions) => void,
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

  const toggleDiscount = useCallback(() => {
    setDraft((prev) => ({ ...prev, discountOnly: !prev.discountOnly }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(draft);
  }, [draft, onApply]);

  const handleClear = useCallback(() => {
    onClear({ includeDiscount: isDiscountShownInSheet() });
  }, [onClear]);

  return {
    draft,
    togglePrice,
    setRating,
    toggleDiscount,
    handleApply,
    handleClear,
  };
}
