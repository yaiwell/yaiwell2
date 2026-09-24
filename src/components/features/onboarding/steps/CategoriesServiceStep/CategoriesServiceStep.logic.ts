'use client';

import { useCallback } from 'react';

import type { AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';

import type { RootCategory } from '../../shared';

/** Duraciones sugeridas (en minutos) — mismas que el panel `addService`. */
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

/**
 * Resuelve el nombre localizado de una categoría, con el `slug` como
 * último recurso para no pintar nunca una opción de select en blanco.
 *
 * La cadena de fallback la pone `pickLocalized` (locale → es → ca → en
 * → de): antes se reimplementaba aquí a mano y era una segunda copia
 * de la misma regla, condenada a desincronizarse.
 */
export function localizedCategoryName(category: RootCategory, locale: AppLocale): string {
  return pickLocalized(category.name, locale) || category.slug;
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
