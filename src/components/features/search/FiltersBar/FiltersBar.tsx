'use client';

import { SlidersHorizontal, Zap } from 'lucide-react';
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
  onCategoryChange,
  onAvailabilityToggle,
  onOpenFiltersSheet,
}: FiltersBarProps) {
  const t = useTranslations('search');
  const tc = useTranslations('search.categories');
  const rootCategories = getRootCategories();

  return (
    <div className={s.root}>
      <div className={s.chipsScroll} role="tablist" aria-label={t('title')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategorySlug === null}
          onClick={() => onCategoryChange(null)}
          className={cn(s.chipBase, activeCategorySlug === null ? s.chipActive : s.chipIdle)}
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
            >
              {tc(cat.slug as 'belleza' | 'estetica' | 'bienestar' | 'deporte')}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-pressed={availabilityOnly}
        onClick={() => onAvailabilityToggle(!availabilityOnly)}
        className={cn(s.toggleNow, availabilityOnly ? s.toggleNowActive : s.toggleNowIdle)}
      >
        <Zap className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t('availableNowToggle')}</span>
      </button>

      <button
        type="button"
        onClick={onOpenFiltersSheet}
        className={s.filterButton}
        aria-label={t('filters.button')}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        <span className="hidden sm:inline">{t('filters.button')}</span>
        {hasAdvancedFilters && <span className={s.filterButtonDot} aria-hidden />}
      </button>
    </div>
  );
}
