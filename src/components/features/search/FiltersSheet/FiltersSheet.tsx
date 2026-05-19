'use client';

import { Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import type { PriceRange } from '@/types/domain';
import { cn } from '@/lib/utils';

import { useFiltersSheet } from './FiltersSheet.logic';
import { filtersSheetStyles as s } from './FiltersSheet.styles';
import type { FiltersSheetProps } from './FiltersSheet.types';

const PRICE_OPTIONS: PriceRange[] = ['€', '€€', '€€€'];
const RATING_OPTIONS: number[] = [4, 4.5, 4.8];

/**
 * Sheet de filtros avanzados (precio y valoración mínima).
 *
 * Implementado con Radix Dialog. En móvil se ve como bottom-sheet,
 * en desktop como modal centrado. Las animaciones provienen de
 * `tw-animate-css` ya importado en globals.
 */
export function FiltersSheet({ open, onOpenChange, value, onApply, onClear }: FiltersSheetProps) {
  const t = useTranslations('search.filters');
  const { draft, togglePrice, setRating, handleApply } = useFiltersSheet(value, open, onApply);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content className={s.content}>
          <header className={s.header}>
            <div className={s.titleBlock}>
              <Dialog.Title className={s.title}>{t('title')}</Dialog.Title>
              <Dialog.Description className={s.description}>{t('description')}</Dialog.Description>
            </div>
            <Dialog.Close aria-label={t('close')} className={s.closeButton}>
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <section className={s.section}>
            <span className={s.sectionLabel}>{t('price')}</span>
            <div className={s.priceRow}>
              {PRICE_OPTIONS.map((range) => {
                const active = draft.priceRange.includes(range);
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => togglePrice(range)}
                    aria-pressed={active}
                    className={cn(s.priceChip, active ? s.priceChipActive : s.priceChipIdle)}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={s.section}>
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
                  >
                    <Star className="size-3.5" aria-hidden />
                    {rating.toFixed(1)}+
                  </button>
                );
              })}
            </div>
          </section>

          <footer className={s.footer}>
            <button type="button" onClick={onClear} className={s.clearButton}>
              {t('clear')}
            </button>
            <button type="button" onClick={handleApply} className={s.applyButton}>
              {t('apply')}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
