'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useSearchBar } from './SearchBar.logic';
import { searchBarStyles as s } from './SearchBar.styles';
import type { SearchBarProps } from './SearchBar.types';

/**
 * Campo de búsqueda principal de la vertical `/buscar`.
 *
 * Permite escribir texto libre y confirma con Enter (submit del form).
 * Muestra un botón "limpiar" cuando hay contenido para volver a estado
 * vacío sin recurrir al teclado.
 */
export function SearchBar({ initialValue = '', onSubmit }: SearchBarProps) {
  const t = useTranslations('search');
  const { value, setValue, handleSubmit, handleClear } = useSearchBar(initialValue, onSubmit);

  return (
    <form role="search" onSubmit={handleSubmit} className={s.form} data-component="search-bar">
      <span className={s.iconLeft} aria-hidden>
        <Search className="size-5" />
      </span>
      <input
        type="search"
        name="q"
        autoComplete="off"
        aria-label={t('searchPlaceholder')}
        placeholder={t('searchPlaceholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={s.input}
        data-component="search-bar-input"
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label={t('filters.clear')}
          onClick={handleClear}
          className={s.clearButton}
          data-component="search-bar-clear"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
