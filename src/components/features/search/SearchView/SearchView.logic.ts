'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';
import type { Suggestion } from '@/lib/fake-data/search-suggestions';
import type { PriceRange } from '@/types/domain';

import type { ActiveFilterChip } from '../ActiveFiltersChips';
import type { AdvancedFiltersValue } from '../FiltersSheet';
import { NEAR_ME_RADIUS_METERS, useNearMe } from './SearchView.nearMe';
import type { MobileTab, SearchViewInitialState } from './SearchView.types';

// Re-export del radio para que los consumidores lo importen desde la
// fachada habitual de lógica (en lugar de tirar del archivo nearMe).
export { NEAR_ME_RADIUS_METERS };

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

  // Distancia + filtro "Cerca de ti" viven en su propio hook para no
  // inflar este orquestador (ver `SearchView.nearMe.ts`).
  const {
    userLocation,
    hasRealLocation,
    nearMeOnly,
    displayProviders,
    nearMeYieldedEmpty,
    handleToggleNearMe,
    handleDisableNearMe,
  } = useNearMe(initial.providers, { initialNearMeOnly: initial.nearMeOnly });

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
            priceRange: filters.priceRange.filter((p) => p !== chip.value),
          });
          return;
        case 'rating':
          updateFilters({ minRating: null });
          return;
      }
    },
    [filters.priceRange, updateFilters],
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

  /**
   * Resuelve la selección de una sugerencia del autocomplete dentro
   * de `/buscar`:
   *  - categoría → actualiza el filtro `cat` y limpia el query.
   *  - servicio → navega a la ficha del proveedor.
   *  - proveedor → navega a la ficha del proveedor.
   *
   * La navegación a fichas se delega en el router para mantener el locale.
   */
  const handleSelectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.type === 'category') {
        updateFilters({ query: '', categorySlug: suggestion.slug });
        return;
      }
      const segment = `${suggestion.providerSlug}-${suggestion.providerId}`;
      startTransition(() => {
        router.push(`/centro/${segment}`);
      });
    },
    [router, updateFilters],
  );

  /**
   * Acción "Ver en la lista" del popup del mapa.
   *
   * En móvil, la columna lista está oculta cuando la pestaña activa es
   * "map", por lo que primero conmutamos la pestaña y resaltamos el id.
   * Esperamos dos `requestAnimationFrame` para que React haya pintado
   * la columna y la card esté en el DOM antes de hacer `scrollIntoView`.
   * En desktop ambas columnas están siempre montadas, así que el scroll
   * funciona igual.
   */
  const handleSeeOnList = useCallback((providerId: string) => {
    setMobileTab('list');
    setHighlightedId(providerId);

    // Doble rAF: el primero permite a React aplicar el cambio de tab,
    // el segundo asegura que el layout se ha recalculado tras el re-render.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-provider-id="${providerId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }, []);

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
    displayProviders,
    nearMeYieldedEmpty,

    // Estado puro UI
    mobileTab,
    setMobileTab,
    filtersSheetOpen,
    setFiltersSheetOpen,
    highlightedId,
    setHighlightedId,

    // Ubicación + filtro "Cerca de ti"
    userLocation,
    hasRealLocation,
    nearMeOnly,
    handleToggleNearMe,
    handleDisableNearMe,

    // Setters de filtros
    handleQueryChange,
    handleCategoryChange,
    handleAvailabilityToggle,
    handleApplyAdvanced,
    handleClearAdvanced,

    // Interacción mapa → lista
    handleSeeOnList,

    // Chips de filtros activos + autocomplete
    handleRemoveChip,
    handleClearAllChips,
    handleSelectSuggestion,
  };
}
