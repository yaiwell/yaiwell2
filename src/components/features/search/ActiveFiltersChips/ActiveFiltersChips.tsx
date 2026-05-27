'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { buildActiveFilterChips } from './ActiveFiltersChips.logic';
import { activeFiltersChipsStyles as s } from './ActiveFiltersChips.styles';
import type { ActiveFilterChip, ActiveFiltersChipsProps } from './ActiveFiltersChips.types';

/**
 * Convierte un chip en su texto visible. Centralizamos aquí para que
 * cada `kind` resuelva su traducción con su namespace propio sin
 * inflar la prop API del componente.
 */
function useChipLabel() {
  const t = useTranslations('searchFilters.chips');

  return (chip: ActiveFilterChip): string => {
    switch (chip.kind) {
      case 'query':
        return t('queryLabel', { value: chip.value });
      case 'category':
        return chip.label;
      case 'availability':
        return t('availabilityLabel');
      case 'price':
        return t('priceLabel', { value: chip.value });
      case 'rating':
        return t('ratingLabel', { value: chip.value.toFixed(1) });
    }
  };
}

/**
 * Genera un identificador estable para los `data-component` por chip.
 * Útil para tests E2E que necesitan localizar un chip concreto.
 */
function chipKey(chip: ActiveFilterChip): string {
  switch (chip.kind) {
    case 'query':
      return 'query';
    case 'category':
      return `category-${chip.slug}`;
    case 'availability':
      return 'availability';
    case 'price':
      return `price-${chip.value.length}`;
    case 'rating':
      return `rating-${chip.value.toString().replace('.', '-')}`;
  }
}

/**
 * Tira horizontal con los filtros activos. Cada chip muestra su
 * etiqueta y un botón X que dispara `onRemove`. Si hay más de un chip
 * añade un "Limpiar todo" al final.
 *
 * No renderiza nada si no hay filtros activos para no ocupar espacio
 * en la lista de resultados.
 */
export function ActiveFiltersChips({
  filters,
  categoryLabel,
  onRemove,
  onClearAll,
}: ActiveFiltersChipsProps) {
  const t = useTranslations('searchFilters.chips');
  const getLabel = useChipLabel();
  const chips = buildActiveFilterChips(filters, categoryLabel);

  if (chips.length === 0) return null;

  return (
    <div
      className={s.root}
      role="group"
      aria-label={t('groupLabel')}
      data-component="active-filters-chips"
    >
      {chips.map((chip) => {
        const key = chipKey(chip);
        const label = getLabel(chip);
        return (
          <span key={key} className={s.chip} data-component={`active-filter-chip-${key}`}>
            <span className={s.chipLabel}>{label}</span>
            <button
              type="button"
              onClick={() => onRemove(chip)}
              aria-label={t('removeAria', { label })}
              className={s.chipRemove}
              data-component={`active-filter-chip-${key}-remove`}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        );
      })}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className={s.clearAll}
          data-component="active-filters-chips-clear-all"
        >
          {t('clearAll')}
        </button>
      )}
    </div>
  );
}
