'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { SEARCH_DAYS_MAX } from '@/lib/utils/search-when';

import {
  buildDayGrid,
  formatCellLabel,
  formatCellMonth,
  getWeekdayLabels,
} from './SearchDayPicker.logic';
import { searchDayPickerStyles as s } from './SearchDayPicker.styles';
import type { SearchDayPickerProps } from './SearchDayPicker.types';

/**
 * Calendario para elegir uno o varios días en los filtros de `/buscar`.
 *
 * Solo se monta con el sheet abierto, en cliente, así que calcular «hoy» en
 * render no puede descuadrar la hidratación.
 */
export function SearchDayPicker({ selected, onToggle }: SearchDayPickerProps) {
  const t = useTranslations('search.when');
  const locale = useLocale();
  const weeks = useMemo(() => buildDayGrid(new Date()), []);
  const isFull = selected.length >= SEARCH_DAYS_MAX;

  return (
    <div className={s.root} data-component="search-day-picker">
      <p className={s.hint}>{t('pickDaysHint', { max: SEARCH_DAYS_MAX })}</p>
      <div className={s.grid}>
        {getWeekdayLabels(weeks[0], locale).map((label, index) => (
          <span key={index} className={s.weekday} aria-hidden="true">
            {label}
          </span>
        ))}
        {weeks.flat().map((cell) => {
          if (cell.outOfRange) return <span key={cell.day} className={s.empty} />;
          const isSelected = selected.includes(cell.day);
          return (
            <button
              key={cell.day}
              type="button"
              onClick={() => onToggle(cell.day)}
              disabled={isFull && !isSelected}
              aria-pressed={isSelected}
              aria-label={formatCellLabel(cell.day, locale)}
              className={cn(s.day, isSelected ? s.daySelected : s.dayIdle)}
              data-component={`search-day-${cell.day}`}
            >
              {cell.showMonth ? (
                <span className={s.month}>{formatCellMonth(cell.day, locale)}</span>
              ) : null}
              {cell.dayOfMonth}
            </button>
          );
        })}
      </div>
    </div>
  );
}
