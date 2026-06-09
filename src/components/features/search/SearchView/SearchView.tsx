'use client';

import { List, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';

import { getCategoryBySlug } from '@/lib/fake-data/categories';
import { pickLocalized } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import { ActiveFiltersChips } from '../ActiveFiltersChips';
import { FiltersBar } from '../FiltersBar';
import { FiltersSheet } from '../FiltersSheet';
import { ProviderList } from '../ProviderList';
import { SearchBar } from '../SearchBar';
import { NEAR_ME_RADIUS_METERS, useSearchView } from './SearchView.logic';
import { searchViewStyles as s } from './SearchView.styles';
import type { SearchViewProps } from './SearchView.types';

// Radio del filtro "Cerca de ti" en km, derivado del valor en metros
// que vive en `SearchView.logic`. Lo pasamos a la UI (chip y empty
// state) para que el copy y el aria-label citen la misma cifra.
const NEAR_ME_RADIUS_KM = NEAR_ME_RADIUS_METERS / 1000;

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
  const locale = useLocale() as 'es' | 'ca' | 'en' | 'de';
  const {
    advancedValue,
    hasAdvancedFilters,
    displayProviders,
    nearMeYieldedEmpty,
    mobileTab,
    setMobileTab,
    filtersSheetOpen,
    setFiltersSheetOpen,
    highlightedId,
    setHighlightedId,
    userLocation,
    hasRealLocation,
    nearMeOnly,
    handleToggleNearMe,
    handleDisableNearMe,
    handleQueryChange,
    handleCategoryChange,
    handleAvailabilityToggle,
    handleApplyAdvanced,
    handleClearAdvanced,
    handleSeeOnList,
    handleRemoveChip,
    handleClearAllChips,
    handleSelectSuggestion,
  } = useSearchView(initial);

  // Resolvemos la etiqueta visible de la categoría activa una sola vez
  // para no recalcular en cada render del chip correspondiente.
  const activeCategory = initial.filters.categorySlug
    ? getCategoryBySlug(initial.filters.categorySlug)
    : null;
  const categoryLabel = activeCategory ? pickLocalized(activeCategory.name, locale) : null;

  return (
    <div className={s.root} data-component="search-view">
      <div className={s.stickyTop} data-component="search-sticky-top">
        <div className={s.topInner}>
          <div className={s.headerRow} data-component="search-header-row">
            <h1 className={s.headerTitle}>{t('title')}</h1>
            <span className={s.resultsCount} data-component="search-results-count">
              {t('resultsCount', { count: displayProviders.length })}
            </span>
          </div>

          <SearchBar
            initialValue={initial.filters.query}
            onSubmit={handleQueryChange}
            locale={locale}
            onSelectSuggestion={handleSelectSuggestion}
          />

          <FiltersBar
            activeCategorySlug={initial.filters.categorySlug}
            availabilityOnly={initial.filters.availabilityOnly}
            hasAdvancedFilters={hasAdvancedFilters}
            nearMeOnly={nearMeOnly}
            nearMeRadiusKm={NEAR_ME_RADIUS_KM}
            onCategoryChange={handleCategoryChange}
            onAvailabilityToggle={handleAvailabilityToggle}
            onNearMeToggle={handleToggleNearMe}
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
            <ActiveFiltersChips
              filters={initial.filters}
              categoryLabel={categoryLabel}
              onRemove={handleRemoveChip}
              onClearAll={handleClearAllChips}
            />
            {nearMeYieldedEmpty ? (
              // Empty state contextual: el filtro "Cerca de ti" ha vaciado la
              // lista. Sugerimos quitarlo en vez del genérico "sin resultados".
              <div className={s.nearMeEmpty} data-component="search-near-me-empty">
                <h3 className={s.nearMeEmptyTitle}>
                  {t('empty.nearMeTitle', { radius: NEAR_ME_RADIUS_KM })}
                </h3>
                <p className={s.nearMeEmptySubtitle}>{t('empty.nearMeSubtitle')}</p>
                <button
                  type="button"
                  onClick={handleDisableNearMe}
                  className={s.nearMeEmptyCta}
                  data-component="search-near-me-empty-cta"
                >
                  {t('empty.disableNearMeCta')}
                </button>
              </div>
            ) : (
              <ProviderList
                providers={displayProviders}
                fromPriceMap={initial.fromPriceMap}
                highlightedId={highlightedId}
                onHoverProvider={setHighlightedId}
                hasRealLocation={hasRealLocation}
              />
            )}
          </div>

          {/* Columna mapa: sticky en desktop, condicionada en móvil. */}
          <div
            className={cn(s.mapColumn, mobileTab === 'map' ? s.mobileMapPanel : 'hidden lg:block')}
            data-component="search-map-column"
          >
            <SearchMapLazy
              providers={displayProviders}
              initialCenter={{ lat: userLocation.lat, lng: userLocation.lng }}
              initialZoom={14}
              highlightedId={highlightedId}
              onHoverProvider={setHighlightedId}
              onProviderSeeOnList={handleSeeOnList}
              userLocation={{ lat: userLocation.lat, lng: userLocation.lng }}
              hasRealLocation={hasRealLocation}
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
