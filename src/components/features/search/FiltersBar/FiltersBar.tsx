'use client';

import { Navigation, SlidersHorizontal, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getRootCategories } from '@/lib/fake-data/categories';
import { cn } from '@/lib/utils';

import { filtersBarStyles as s } from './FiltersBar.styles';
import type { FiltersBarProps } from './FiltersBar.types';

/**
 * Barra de filtros principales del buscador.
 *
 * Se compone de tres bloques de izquierda a derecha:
 *  1. Chips horizontales con las categorías raíz + chip "Todas".
 *  2. Toggle destacado "Solo disponibles ahora".
 *  3. Botón "Filtros" que abre el sheet de avanzados.
 *
 * En móvil los chips son scrollables; el toggle y el botón quedan
 * fijos a la derecha gracias al `flex-1 + shrink-0`.
 */
export function FiltersBar({
  activeCategorySlug,
  availabilityOnly,
  hasAdvancedFilters,
  nearMeOnly,
  nearMeRadiusKm,
  onCategoryChange,
  onAvailabilityToggle,
  onNearMeToggle,
  onOpenFiltersSheet,
}: FiltersBarProps) {
  const t = useTranslations('search');
  const tc = useTranslations('search.categories');
  const rootCategories = getRootCategories();

  return (
    <div className={s.root} data-component="filters-bar">
      <div
        className={s.chipsScroll}
        role="tablist"
        aria-label={t('title')}
        data-component="filters-bar-categories"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCategorySlug === null}
          onClick={() => onCategoryChange(null)}
          className={cn(s.chipBase, activeCategorySlug === null ? s.chipActive : s.chipIdle)}
          data-component="filters-bar-category-all"
        >
          {tc('all')}
        </button>
        {rootCategories.map((cat) => {
          const isActive = activeCategorySlug === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onCategoryChange(isActive ? null : cat.slug)}
              className={cn(s.chipBase, isActive ? s.chipActive : s.chipIdle)}
              data-component={`filters-bar-category-${cat.slug}`}
            >
              {tc(cat.slug as 'belleza' | 'estetica' | 'bienestar' | 'deporte')}
            </button>
          );
        })}
      </div>

      <div className={s.actions}>
        <button
          type="button"
          aria-pressed={nearMeOnly}
          aria-label={t('nearMeChipAria', { radius: nearMeRadiusKm })}
          onClick={onNearMeToggle}
          className={cn(s.toggleNear, nearMeOnly ? s.toggleNearActive : s.toggleNearIdle)}
          data-component="filters-near-me-toggle"
        >
          <Navigation className="size-4" aria-hidden />
          <span>{t('nearMeChip')}</span>
        </button>

        <button
          type="button"
          aria-pressed={availabilityOnly}
          onClick={() => onAvailabilityToggle(!availabilityOnly)}
          className={cn(s.toggleNow, availabilityOnly ? s.toggleNowActive : s.toggleNowIdle)}
          data-component="filters-availability-toggle"
        >
          <Zap className="size-4" aria-hidden />
          <span>{t('availableNowToggle')}</span>
        </button>

        <button
          type="button"
          onClick={onOpenFiltersSheet}
          className={s.filterButton}
          aria-label={t('filters.button')}
          data-component="filters-bar-open-sheet"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span>{t('filters.button')}</span>
          {hasAdvancedFilters && <span className={s.filterButtonDot} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
