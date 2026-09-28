import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { SearchView } from './SearchView';
import type { SearchViewInitialState } from './SearchView.types';

/**
 * Tests del estado "recalculando" de `SearchView`.
 *
 * Aislamos la vista de sus hijos pesados (mapa, autocomplete, lista) y
 * del orquestador: solo nos interesa que `isPending` llegue a la región
 * de la lista como `aria-busy` y como estilo atenuado.
 */

const pendingState = vi.hoisted(() => ({ value: false }));

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('../SearchBar', () => ({ SearchBar: () => null }));
vi.mock('../FiltersSheet', () => ({ FiltersSheet: () => null }));
vi.mock('../ActiveFiltersChips', () => ({ ActiveFiltersChips: () => null }));
vi.mock('../ProviderList', () => ({ ProviderList: () => <ul aria-label="resultados" /> }));
vi.mock('../FiltersBar', () => ({
  FiltersBar: ({ categories }: { categories: { slug: string; label: string }[] }) => (
    <div data-testid="filters-bar">{categories.map((c) => c.label).join(',')}</div>
  ),
}));

vi.mock('./SearchView.logic', () => ({
  NEAR_ME_RADIUS_METERS: 5_000,
  useSearchView: () => ({
    advancedValue: { priceRange: [], minRating: null },
    hasAdvancedFilters: false,
    isPending: pendingState.value,
    displayProviders: [],
    nearMeYieldedEmpty: false,
    mobileTab: 'list',
    setMobileTab: vi.fn(),
    filtersSheetOpen: false,
    setFiltersSheetOpen: vi.fn(),
    highlightedId: null,
    setHighlightedId: vi.fn(),
    userLocation: { lat: 0, lng: 0 },
    hasRealLocation: false,
    nearMeOnly: false,
    handleToggleNearMe: vi.fn(),
    handleDisableNearMe: vi.fn(),
    handleQueryChange: vi.fn(),
    handleCategoryChange: vi.fn(),
    handleAvailabilityToggle: vi.fn(),
    handleApplyAdvanced: vi.fn(),
    handleClearAdvanced: vi.fn(),
    handleSeeOnList: vi.fn(),
    handleRemoveChip: vi.fn(),
    handleClearAllChips: vi.fn(),
    handleSelectSuggestion: vi.fn(),
  }),
}));

const messages = {
  search: {
    title: 'Buscar',
    resultsCount: '{count} resultados',
    tabs: { list: 'Lista', map: 'Mapa' },
  },
};

const initial: SearchViewInitialState = {
  providers: [],
  fromPriceMap: {},
  filters: {
    query: '',
    categorySlug: null,
    availabilityOnly: false,
    priceRange: [],
    minRating: null,
  },
};

function renderView() {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SearchView
        initial={initial}
        categories={{
          roots: [{ id: 'c1', slug: 'mascotas', label: 'Mascotas' }],
          activeLabel: null,
        }}
      />
    </NextIntlClientProvider>,
  );
  return document.querySelector('[data-component="search-list-column"]');
}

describe('SearchView — estado pendiente', () => {
  it('marca la lista con aria-busy y la atenúa mientras se refiltra', () => {
    pendingState.value = true;
    const list = renderView();

    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(list?.className).toContain('opacity-60');
  });

  it('sin navegación en curso la lista no está ocupada', () => {
    pendingState.value = false;
    const list = renderView();

    expect(list).toHaveAttribute('aria-busy', 'false');
    expect(list?.className).not.toContain('opacity-60');
  });

  it('pasa las categorías de la BD a la barra de filtros', () => {
    pendingState.value = false;
    renderView();

    expect(screen.getByTestId('filters-bar')).toHaveTextContent('Mascotas');
  });
});
