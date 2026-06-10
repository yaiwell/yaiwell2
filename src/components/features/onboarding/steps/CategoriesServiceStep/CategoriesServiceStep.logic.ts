'use client';

import { useCallback } from 'react';

import type { AppLocale } from '@/i18n/routing';

import type { RootCategory } from '../../shared';

/** Duraciones sugeridas (en minutos) — mismas que el panel `addService`. */
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

/**
 * Resuelve el nombre localizado de una categoría con fallback es → ca
 * → en → de. Mantiene la coherencia con `pickLocalized` del proyecto.
 */
export function localizedCategoryName(category: RootCategory, locale: AppLocale): string {
  const tryOrder: AppLocale[] = [locale, 'es', 'ca', 'en', 'de'];
  for (const loc of tryOrder) {
    const value = category.name[loc];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return category.slug;
}

/**
 * Hook pequeño para el paso 4: convierte la entrada del input de
 * precio (string en euros con coma o punto) a un número con dos
 * decimales, y expone `setDuration` con una lista cerrada.
 */
export function useCategoriesServiceStep(params: {
  onChange: (patch: { servicePriceEuros?: number; serviceDurationMinutes?: number }) => void;
}) {
  const { onChange } = params;

  const handlePriceChange = useCallback(
    (raw: string) => {
      // Soportamos coma o punto como separador decimal (mercado ES).
      const normalized = raw.replace(',', '.');
      // Aceptamos vacío como `0`, evitando NaN al borrar el input.
      const parsed = normalized === '' ? 0 : Number(normalized);
      if (Number.isNaN(parsed)) return;
      // Limitamos a dos decimales y a un máximo razonable (10.000 €).
      const clamped = Math.min(10_000, Math.max(0, Math.round(parsed * 100) / 100));
      onChange({ servicePriceEuros: clamped });
    },
    [onChange],
  );

  const handleDurationChange = useCallback(
    (minutes: number) => {
      onChange({ serviceDurationMinutes: minutes });
    },
    [onChange],
  );

  return { handlePriceChange, handleDurationChange };
}
