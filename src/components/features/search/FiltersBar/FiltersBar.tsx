'use client';

import { Loader2, Navigation, SlidersHorizontal, Sparkles, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { filtersBarStyles as s } from './FiltersBar.styles';
import type { FiltersBarProps } from './FiltersBar.types';

/**
 * Barra de filtros principales del buscador.
 *
 * Piezas: toggles («Cerca de ti», «Solo disponibles ahora» y, desde `md`,
 * «Con descuento»), chips de categorías raíz (llegan de la BD ya
 * localizadas) y el botón «Filtros» que abre el sheet de avanzados.
 *
 * - **Móvil**: una sola fila deslizable con los toggles delante, un
 *   separador y las categorías; «Filtros» queda fijo a la derecha como
 *   icono. Antes los toggles iban en una fila alineada a la derecha que no
 *   cabía a 375 px y cortaba «Cerca de ti» por la izquierda.
 * - **md+**: el contenedor deslizable se disuelve (`md:contents`) y todo
 *   vuelve a la fila única: categorías a la izquierda, acciones a la derecha.
 *
 * En móvil «Con descuento» vive en el sheet de filtros.
 */
export function FiltersBar({
  categories,
  activeCategorySlug,
  availabilityOnly,
  discountOnly,
  hasAdvancedFilters,
  nearMeOnly,
  nearMeLocating = false,
  nearMeLocationFailed = false,
  nearMeRadiusKm,
  onCategoryChange,
  onAvailabilityToggle,
  onDiscountToggle,
  onNearMeToggle,
  onOpenFiltersSheet,
}: FiltersBarProps) {
  const t = useTranslations('search');
  const tc = useTranslations('search.categories');
  const NearIcon = nearMeLocating ? Loader2 : Navigation;

  return (
    <div className={s.root} data-component="filters-bar">
      <div className={s.row}>
        <div className={s.scroller} data-component="filters-bar-scroller">
          <div className={s.toggles}>
            <button
              type="button"
              aria-pressed={nearMeOnly}
              aria-busy={nearMeLocating}
              aria-label={t('nearMeChipAria', { radius: nearMeRadiusKm })}
              onClick={onNearMeToggle}
              disabled={nearMeLocating}
              className={cn(s.chipBase, nearMeOnly ? s.toggleNearActive : s.chipIdle)}
              data-component="filters-near-me-toggle"
            >
              <NearIcon className={cn(s.icon, nearMeLocating && s.spin)} aria-hidden />
              <span>{nearMeLocating ? t('nearMeLocating') : t('nearMeChip')}</span>
            </button>

            <button
              type="button"
              aria-pressed={availabilityOnly}
              onClick={() => onAvailabilityToggle(!availabilityOnly)}
              className={cn(s.chipBase, availabilityOnly ? s.toggleNowActive : s.chipIdle)}
              data-component="filters-availability-toggle"
            >
              <Zap className={s.icon} aria-hidden />
              <span>{t('availableNowToggle')}</span>
            </button>

            <button
              type="button"
              aria-pressed={discountOnly}
              onClick={() => onDiscountToggle(!discountOnly)}
              className={cn(
                s.chipBase,
                s.toggleOffer,
                discountOnly ? s.toggleOfferActive : s.chipIdle,
              )}
              data-component="filters-discount-toggle"
            >
              <Sparkles className={s.icon} aria-hidden />
              <span>{t('slotOffer.filterToggle')}</span>
            </button>
          </div>

          <span className={s.divider} aria-hidden />

          <div
            className={s.categories}
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
            {categories.map((cat) => {
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
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFiltersSheet}
          className={s.filterButton}
          aria-label={t('filters.button')}
          data-component="filters-bar-open-sheet"
        >
          <SlidersHorizontal className={s.icon} aria-hidden />
          <span className={s.filterButtonLabel}>{t('filters.button')}</span>
          {(hasAdvancedFilters || discountOnly) && (
            <span
              className={cn(s.filterButtonDot, !hasAdvancedFilters && s.filterButtonDotMobileOnly)}
              aria-hidden
              data-component="filters-bar-open-sheet-dot"
            />
          )}
        </button>
      </div>

      {nearMeLocationFailed && (
        <p className={s.hint} role="status" data-component="filters-near-me-failed">
          {t('nearMeLocationFailed')}
        </p>
      )}
    </div>
  );
}
