'use client';

import { CalendarDays, Sparkles, Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import type { PriceRange } from '@/types/domain';
import { cn } from '@/lib/utils';
import { SEARCH_WHEN_OPTIONS } from '@/lib/utils/search-when';

import { SearchDayPicker } from '../SearchDayPicker';
import { useFiltersSheet } from './FiltersSheet.logic';
import { filtersSheetStyles as s } from './FiltersSheet.styles';
import type { FiltersSheetProps } from './FiltersSheet.types';

const PRICE_OPTIONS: PriceRange[] = ['€', '€€', '€€€'];
const RATING_OPTIONS: number[] = [4, 4.5, 4.8];

/**
 * Sheet de filtros avanzados (días, precio, valoración mínima y, en móvil,
 * "Con descuento", que desde `md` está en la barra).
 *
 * Implementado con Radix Dialog. En móvil se ve como bottom-sheet,
 * en desktop como modal centrado. Las animaciones provienen de
 * `tw-animate-css` ya importado en globals.
 */
export function FiltersSheet({ open, onOpenChange, value, onApply, onClear }: FiltersSheetProps) {
  const t = useTranslations('search.filters');
  const tOffer = useTranslations('search.slotOffer');
  const tWhen = useTranslations('search.when');
  const {
    draft,
    togglePrice,
    setRating,
    toggleDiscount,
    setWhen,
    pickingDays,
    startPickingDays,
    toggleDay,
    handleApply,
    handleClear,
  } = useFiltersSheet(value, open, onApply, onClear);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} data-component="filters-sheet-overlay" />
        <Dialog.Content className={s.content} data-component="filters-sheet">
          <header className={s.header} data-component="filters-sheet-header">
            <div className={s.titleBlock}>
              <Dialog.Title className={s.title}>{t('title')}</Dialog.Title>
              <Dialog.Description className={s.description}>{t('description')}</Dialog.Description>
            </div>
            <Dialog.Close
              aria-label={t('close')}
              className={s.closeButton}
              data-component="filters-sheet-close"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          {/* Solo esta parte hace scroll: con el calendario abierto no cabe todo
              en un móvil y «Aplicar» debe seguir a la vista. */}
          <div className={s.body} data-component="filters-sheet-body">
            <section className={s.section} data-component="filters-sheet-section-when">
              <span className={s.sectionLabel}>{tWhen('label')}</span>
              <div className={s.ratingRow}>
                <button
                  type="button"
                  onClick={() => setWhen(null)}
                  aria-pressed={draft.when === null && !pickingDays}
                  className={cn(
                    s.ratingChip,
                    draft.when === null && !pickingDays ? s.ratingChipActive : s.ratingChipIdle,
                  )}
                  data-component="filters-sheet-when-any"
                >
                  {tWhen('any')}
                </button>
                {SEARCH_WHEN_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setWhen(option)}
                    aria-pressed={draft.when === option}
                    className={cn(
                      s.ratingChip,
                      draft.when === option ? s.ratingChipActive : s.ratingChipIdle,
                    )}
                    data-component={`filters-sheet-when-${option}`}
                  >
                    {tWhen(option)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={startPickingDays}
                  aria-pressed={pickingDays}
                  aria-expanded={pickingDays}
                  className={cn(s.ratingChip, pickingDays ? s.ratingChipActive : s.ratingChipIdle)}
                  data-component="filters-sheet-when-pick-days"
                >
                  <CalendarDays className="size-3.5" aria-hidden />
                  {tWhen('pickDays')}
                </button>
              </div>
              {pickingDays ? <SearchDayPicker selected={draft.days} onToggle={toggleDay} /> : null}
            </section>

            <section className={s.section} data-component="filters-sheet-section-price">
              <span className={s.sectionLabel}>{t('price')}</span>
              <div className={s.priceRow}>
                {PRICE_OPTIONS.map((range) => {
                  const active = draft.priceRange.includes(range);
                  // Slug ASCII a partir del símbolo (€ → 1, €€ → 2, €€€ → 3).
                  const slug = range.length;
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => togglePrice(range)}
                      aria-pressed={active}
                      className={cn(s.priceChip, active ? s.priceChipActive : s.priceChipIdle)}
                      data-component={`filters-sheet-price-${slug}`}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={s.section} data-component="filters-sheet-section-rating">
              <span className={s.sectionLabel}>{t('minRating')}</span>
              <div className={s.ratingRow}>
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  aria-pressed={draft.minRating === null}
                  className={cn(
                    s.ratingChip,
                    draft.minRating === null ? s.ratingChipActive : s.ratingChipIdle,
                  )}
                  data-component="filters-sheet-rating-any"
                >
                  {t('anyRating')}
                </button>
                {RATING_OPTIONS.map((rating) => {
                  const active = draft.minRating === rating;
                  return (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setRating(rating)}
                      aria-pressed={active}
                      className={cn(s.ratingChip, active ? s.ratingChipActive : s.ratingChipIdle)}
                      data-component={`filters-sheet-rating-${rating.toString().replace('.', '-')}`}
                    >
                      <Star className="size-3.5" aria-hidden />
                      {rating.toFixed(1)}+
                    </button>
                  );
                })}
              </div>
            </section>

            <section
              className={cn(s.section, s.sectionMobileOnly)}
              data-component="filters-sheet-section-discount"
            >
              <span className={s.sectionLabel}>{tOffer('sheetSectionLabel')}</span>
              <button
                type="button"
                onClick={toggleDiscount}
                aria-pressed={draft.discountOnly}
                className={cn(
                  s.offerChip,
                  draft.discountOnly ? s.offerChipActive : s.offerChipIdle,
                )}
                data-component="filters-sheet-discount-toggle"
              >
                <Sparkles className="size-3.5" aria-hidden />
                {tOffer('filterToggle')}
              </button>
            </section>
          </div>

          <footer className={s.footer} data-component="filters-sheet-footer">
            <button
              type="button"
              onClick={handleClear}
              className={s.clearButton}
              data-component="filters-sheet-clear"
            >
              {t('clear')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className={s.applyButton}
              data-component="filters-sheet-apply"
            >
              {t('apply')}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
