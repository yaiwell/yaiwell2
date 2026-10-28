import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchView } from './SearchView.logic';
import type { SearchViewInitialState } from './SearchView.types';

/**
 * Tests del orquestador `useSearchView` centrados en la URL.
 *
 * Mockeamos el router de next-intl para inspeccionar a qué URL navega
 * cada handler, y la ubicación del usuario para no depender del
 * provider real.
 */

const replace = vi.fn();
const push = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => '/buscar',
}));

vi.mock('@/components/shared/UserLocationProvider', () => ({
  useUserLocation: () => ({
    location: { lat: 41.3874, lng: 2.1686, source: 'gps', capturedAt: 0 },
    hasRealLocation: true,
  }),
}));

function makeInitial(overrides: Partial<SearchViewInitialState> = {}): SearchViewInitialState {
  return {
    providers: [],
    fromPriceMap: {},
    filters: {
      query: '',
      categorySlug: 'belleza',
      availabilityOnly: false,
      discountOnly: false,
      priceRange: [],
      minRating: null,
    },
    nearMeOnly: false,
    ...overrides,
  };
}

/** Última URL a la que se navegó con `router.replace`. */
function lastReplacedUrl(): string | undefined {
  return replace.mock.calls.at(-1)?.[0] as string | undefined;
}

beforeEach(() => {
  replace.mockReset();
  push.mockReset();
});

describe('useSearchView — sincronización de "Cerca de ti" con la URL', () => {
  it('al activar el chip escribe near=me conservando el resto de filtros', () => {
    const { result } = renderHook(() => useSearchView(makeInitial()));

    act(() => result.current.handleToggleNearMe());

    expect(result.current.nearMeOnly).toBe(true);
    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza&near=me');
    expect(replace.mock.calls.at(-1)?.[1]).toEqual({ scroll: false });
  });

  it('al desactivarlo desde el empty state retira near de la URL', () => {
    const { result } = renderHook(() => useSearchView(makeInitial({ nearMeOnly: true })));

    act(() => result.current.handleDisableNearMe());

    expect(result.current.nearMeOnly).toBe(false);
    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza');
  });

  it('cambiar otro filtro NO pierde near=me', () => {
    const { result } = renderHook(() => useSearchView(makeInitial({ nearMeOnly: true })));

    act(() => result.current.handleAvailabilityToggle(true));

    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza&now=1&near=me');
  });

  it('se re-sincroniza cuando la URL cambia por fuera (atrás/adelante)', () => {
    const { result, rerender } = renderHook(({ initial }) => useSearchView(initial), {
      initialProps: { initial: makeInitial({ nearMeOnly: true }) },
    });
    expect(result.current.nearMeOnly).toBe(true);

    rerender({ initial: makeInitial({ nearMeOnly: false }) });

    expect(result.current.nearMeOnly).toBe(false);
  });
});

describe('useSearchView — sheet de filtros avanzados', () => {
  it('"Limpiar filtros" cierra el sheet, igual que "Aplicar"', () => {
    const { result } = renderHook(() => useSearchView(makeInitial()));

    act(() => result.current.setFiltersSheetOpen(true));
    expect(result.current.filtersSheetOpen).toBe(true);

    act(() => result.current.handleClearAdvanced());

    expect(result.current.filtersSheetOpen).toBe(false);
    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza');
  });

  it('"Aplicar" navega con los filtros avanzados y cierra el sheet', () => {
    const { result } = renderHook(() => useSearchView(makeInitial()));

    act(() => result.current.setFiltersSheetOpen(true));
    act(() =>
      result.current.handleApplyAdvanced({ priceRange: ['€€'], minRating: 4, discountOnly: false }),
    );

    expect(result.current.filtersSheetOpen).toBe(false);
    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza&price=%E2%82%AC%E2%82%AC&rating=4');
  });

  it('el sheet lleva «Con descuento» en su borrador y lo aplica como ?discount=1', () => {
    const { result } = renderHook(() => useSearchView(makeInitial()));
    expect(result.current.advancedValue.discountOnly).toBe(false);

    act(() =>
      result.current.handleApplyAdvanced({ priceRange: [], minRating: null, discountOnly: true }),
    );

    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza&discount=1');
  });

  it('«Limpiar» del sheet quita el descuento solo si estaba a la vista (móvil)', () => {
    const initial = makeInitial({
      filters: { ...makeInitial().filters, discountOnly: true, minRating: 4 },
    });
    const { result } = renderHook(() => useSearchView(initial));
    expect(result.current.advancedValue.discountOnly).toBe(true);

    // Escritorio: el toggle vive en la barra y no se toca.
    act(() => result.current.handleClearAdvanced({ includeDiscount: false }));
    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza&discount=1');

    // Móvil: estaba en el sheet, así que se limpia con lo demás.
    act(() => result.current.handleClearAdvanced({ includeDiscount: true }));
    expect(lastReplacedUrl()).toBe('/buscar?cat=belleza');
  });
});
