'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';
import type { PriceRange } from '@/types/domain';

import type { AdvancedFiltersValue } from '../FiltersSheet';
import type { MobileTab, SearchViewInitialState } from './SearchView.types';

/**
 * Construye la URL de búsqueda a partir de los filtros activos.
 *
 * Estrategia "URL as state": cada cambio dispara una navegación que
 * re-renderiza la page server-side con los nuevos `searchParams`,
 * y next-intl mantiene el locale automáticamente.
 *
 * Mantenemos compacto el querystring: omitimos claves cuyos valores
 * son los predeterminados (sin texto, sin categoría, sin "ahora", etc.).
 */
function buildSearchParams(filters: SearchViewInitialState['filters']): string {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.categorySlug) params.set('cat', filters.categorySlug);
  if (filters.availabilityOnly) params.set('now', '1');
  if (filters.priceRange.length > 0) params.set('price', filters.priceRange.join(','));
  if (filters.minRating !== null) params.set('rating', String(filters.minRating));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Hook orquestador del buscador.
 *
 * Responsabilidades:
 *  - Mantener el estado de los filtros sincronizado con la URL.
 *  - Exponer setters tipados para cada bloque (texto, categoría,
 *    toggle "ahora", filtros avanzados).
 *  - Gestionar UI no persistente: pestaña móvil activa, sheet abierto,
 *    proveedor "hovered".
 *  - Marcar la navegación como transición para no bloquear la UI.
 */
export function useSearchView(initial: SearchViewInitialState) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [mobileTab, setMobileTab] = useState<MobileTab>('list');
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Estado local que SIEMPRE refleja la URL. Lo derivamos del initial
  // que llega del server; cada navegación produce un nuevo `initial`.
  const filters = initial.filters;

  /**
   * Aplica un patch parcial sobre los filtros y navega a la nueva URL.
   * Centralizamos aquí para que cada setter de UI sea una línea.
   */
  const updateFilters = useCallback(
    (patch: Partial<SearchViewInitialState['filters']>) => {
      const next: SearchViewInitialState['filters'] = { ...filters, ...patch };
      const qs = buildSearchParams(next);
      // pathname viene sin prefijo de locale; el wrapper de next-intl
      // se encarga de añadir `/ca` si procede.
      startTransition(() => {
        router.replace(`${pathname}${qs}`, { scroll: false });
      });
    },
    [filters, pathname, router],
  );

  const handleQueryChange = useCallback(
    (query: string) => updateFilters({ query }),
    [updateFilters],
  );

  const handleCategoryChange = useCallback(
    (categorySlug: string | null) => updateFilters({ categorySlug }),
    [updateFilters],
  );

  const handleAvailabilityToggle = useCallback(
    (availabilityOnly: boolean) => updateFilters({ availabilityOnly }),
    [updateFilters],
  );

  const handleApplyAdvanced = useCallback(
    (value: AdvancedFiltersValue) => {
      updateFilters({
        priceRange: value.priceRange,
        minRating: value.minRating,
      });
      setFiltersSheetOpen(false);
    },
    [updateFilters],
  );

  const handleClearAdvanced = useCallback(() => {
    updateFilters({
      priceRange: [] as PriceRange[],
      minRating: null,
    });
  }, [updateFilters]);

  const advancedValue: AdvancedFiltersValue = useMemo(
    () => ({
      priceRange: filters.priceRange,
      minRating: filters.minRating,
    }),
    [filters.priceRange, filters.minRating],
  );

  const hasAdvancedFilters = filters.priceRange.length > 0 || filters.minRating !== null;

  return {
    // Datos derivados
    advancedValue,
    hasAdvancedFilters,
    isPending,

    // Estado puro UI
    mobileTab,
    setMobileTab,
    filtersSheetOpen,
    setFiltersSheetOpen,
    highlightedId,
    setHighlightedId,

    // Setters de filtros
    handleQueryChange,
    handleCategoryChange,
    handleAvailabilityToggle,
    handleApplyAdvanced,
    handleClearAdvanced,
  };
}
