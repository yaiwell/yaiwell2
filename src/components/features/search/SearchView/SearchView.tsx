'use client';

import { List, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

import { cn } from '@/lib/utils';

import { FiltersBar } from '../FiltersBar';
import { FiltersSheet } from '../FiltersSheet';
import { ProviderList } from '../ProviderList';
import { SearchBar } from '../SearchBar';
import { useSearchView } from './SearchView.logic';
import { searchViewStyles as s } from './SearchView.styles';
import type { SearchViewProps } from './SearchView.types';

/**
 * El mapa toca `window` durante el require (Leaflet hace introspección
 * del entorno). Lo cargamos solo en cliente con `ssr: false` para
 * evitar errores de hidratación. Pintamos un placeholder mientras llega.
 */
const SearchMapLazy = dynamic(() => import('../SearchMap/SearchMap').then((m) => m.SearchMap), {
  ssr: false,
  loading: () => <div className="bg-muted h-full min-h-[60dvh] w-full animate-pulse rounded-3xl" />,
});

/**
 * Orquestador de la vertical de búsqueda.
 *
 * Lee el `initial` server-side (filtros + resultados) y compone:
 *  - Barra superior sticky con SearchBar, FiltersBar y pestañas móvil.
 *  - Cuerpo split en desktop (lista + mapa) o tabbed en móvil.
 *  - Sheet de filtros avanzados.
 *
 * Toda la lógica está en `useSearchView`. Aquí solo JSX y wiring.
 */
export function SearchView({ initial }: SearchViewProps) {
  const t = useTranslations('search');
  const {
    advancedValue,
    hasAdvancedFilters,
    mobileTab,
    setMobileTab,
    filtersSheetOpen,
    setFiltersSheetOpen,
    highlightedId,
    setHighlightedId,
    handleQueryChange,
    handleCategoryChange,
    handleAvailabilityToggle,
    handleApplyAdvanced,
    handleClearAdvanced,
  } = useSearchView(initial);

  return (
    <div className={s.root} data-component="search-view">
      <div className={s.stickyTop} data-component="search-sticky-top">
        <div className={s.topInner}>
          <div className={s.headerRow} data-component="search-header-row">
            <h1 className={s.headerTitle}>{t('title')}</h1>
            <span className={s.resultsCount} data-component="search-results-count">
              {t('resultsCount', { count: initial.providers.length })}
            </span>
          </div>

          <SearchBar initialValue={initial.filters.query} onSubmit={handleQueryChange} />

          <FiltersBar
            activeCategorySlug={initial.filters.categorySlug}
            availabilityOnly={initial.filters.availabilityOnly}
            hasAdvancedFilters={hasAdvancedFilters}
            onCategoryChange={handleCategoryChange}
            onAvailabilityToggle={handleAvailabilityToggle}
            onOpenFiltersSheet={() => setFiltersSheetOpen(true)}
          />

          {/* Tabs solo visibles en móvil; en desktop el split muestra ambos. */}
          <div className={s.mobileTabs} role="tablist" data-component="search-mobile-tabs">
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'list'}
              onClick={() => setMobileTab('list')}
              className={cn(
                s.mobileTabBase,
                mobileTab === 'list' ? s.mobileTabActive : s.mobileTabIdle,
              )}
              data-component="search-mobile-tab-list"
            >
              <List className="size-4" aria-hidden />
              {t('tabs.list')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileTab === 'map'}
              onClick={() => setMobileTab('map')}
              className={cn(
                s.mobileTabBase,
                mobileTab === 'map' ? s.mobileTabActive : s.mobileTabIdle,
              )}
              data-component="search-mobile-tab-map"
            >
              <MapPin className="size-4" aria-hidden />
              {t('tabs.map')}
            </button>
          </div>
        </div>
      </div>

      <div className={s.body} data-component="search-body">
        <div className={s.splitGrid}>
          {/* Columna lista: siempre montada en desktop, condicionada en móvil. */}
          <div
            className={cn(s.listColumn, mobileTab === 'list' ? 'block' : 'hidden', 'lg:block')}
            data-component="search-list-column"
          >
            <ProviderList
              providers={initial.providers}
              fromPriceMap={initial.fromPriceMap}
              highlightedId={highlightedId}
              onHoverProvider={setHighlightedId}
            />
          </div>

          {/* Columna mapa: sticky en desktop, condicionada en móvil. */}
          <div
            className={cn(s.mapColumn, mobileTab === 'map' ? s.mobileMapPanel : 'hidden lg:block')}
            data-component="search-map-column"
          >
            <SearchMapLazy
              providers={initial.providers}
              initialCenter={{ lat: 41.3851, lng: 2.1734 }}
              initialZoom={13}
              highlightedId={highlightedId}
              onHoverProvider={setHighlightedId}
            />
          </div>
        </div>
      </div>

      <FiltersSheet
        open={filtersSheetOpen}
        onOpenChange={setFiltersSheetOpen}
        value={advancedValue}
        onApply={handleApplyAdvanced}
        onClear={handleClearAdvanced}
      />
    </div>
  );
}
