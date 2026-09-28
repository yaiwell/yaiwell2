'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';
import type { Suggestion } from '@/lib/fake-data/search-suggestions';
import type { PriceRange } from '@/types/domain';

import type { AdvancedFiltersValue } from '../FiltersSheet';
import { useFilterChipHandlers } from './SearchView.chips';
import { NEAR_ME_RADIUS_METERS, useNearMe } from './SearchView.nearMe';
import type {
  MobileTab,
  SearchFilters,
  SearchUrlState,
  SearchViewInitialState,
} from './SearchView.types';
import { buildSearchParams } from './SearchView.url';

// Re-export del radio para que los consumidores lo importen desde la
// fachada habitual de lógica (en lugar de tirar del archivo nearMe).
export { NEAR_ME_RADIUS_METERS };

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
   * Navega a la URL que codifica `state`. Es la única salida hacia el
   * router, así que ningún handler puede olvidarse de un parámetro.
   */
  const navigate = useCallback(
    (state: SearchUrlState) => {
      const qs = buildSearchParams(state);
      // pathname viene sin prefijo de locale; el wrapper de next-intl
      // se encarga de añadir `/ca` si procede.
      startTransition(() => {
        router.replace(`${pathname}${qs}`, { scroll: false });
      });
    },
    [pathname, router],
  );

  // Al cambiar "Cerca de ti" reescribimos `?near=me` conservando el
  // resto de filtros, para que el estado se pueda compartir y recargar.
  const handleNearMeChange = useCallback(
    (nearMeOnly: boolean) => navigate({ ...filters, nearMeOnly }),
    [filters, navigate],
  );

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
  } = useNearMe(initial.providers, {
    initialNearMeOnly: initial.nearMeOnly ?? false,
    onNearMeChange: handleNearMeChange,
  });

  /**
   * Aplica un patch parcial sobre los filtros y navega a la nueva URL.
   * Arrastra el valor vigente de "Cerca de ti": antes se perdía en
   * cuanto el usuario tocaba cualquier otro filtro.
   */
  const updateFilters = useCallback(
    (patch: Partial<SearchFilters>) => navigate({ ...filters, ...patch, nearMeOnly }),
    [filters, nearMeOnly, navigate],
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

  // Cerramos el sheet igual que "Aplicar": limpiar también es una
  // decisión final, y dejarlo abierto ocultaba el resultado del cambio.
  const handleClearAdvanced = useCallback(() => {
    updateFilters({
      priceRange: [] as PriceRange[],
      minRating: null,
    });
    setFiltersSheetOpen(false);
  }, [updateFilters]);

  // Chips de filtros activos: handlers aislados en su propio hook.
  const { handleRemoveChip, handleClearAllChips } = useFilterChipHandlers(
    filters.priceRange,
    updateFilters,
  );

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
