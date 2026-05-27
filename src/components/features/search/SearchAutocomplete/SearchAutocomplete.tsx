'use client';

import { Building2, Search, Sparkles, Tag, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

import { cn } from '@/lib/utils';
import type { Suggestion } from '@/lib/fake-data/search-suggestions';

import { useSearchAutocomplete } from './SearchAutocomplete.logic';
import { searchAutocompleteStyles as s } from './SearchAutocomplete.styles';
import type { SearchAutocompleteProps } from './SearchAutocomplete.types';

/**
 * Mapa de iconos por tipo de sugerencia.
 * Se evalúa por render; el coste es despreciable y mejora la legibilidad.
 */
const ICON_BY_TYPE = {
  category: Tag,
  service: Sparkles,
  provider: Building2,
} as const;

/**
 * Pinta el label resaltando el fragmento coincidente con el query.
 * El resaltado se hace por rango, no por regex, para evitar problemas
 * con acentos y caracteres especiales.
 */
function HighlightedLabel({
  label,
  matchRange,
}: {
  label: string;
  matchRange: Suggestion['matchRange'];
}) {
  if (!matchRange) {
    return <span className={s.optionLabel}>{label}</span>;
  }
  const [start, end] = matchRange;
  const before = label.slice(0, start);
  const match = label.slice(start, end);
  const after = label.slice(end);

  return (
    <span className={s.optionLabel}>
      {before}
      <mark className={s.optionLabelMatch}>{match}</mark>
      {after}
    </span>
  );
}

/**
 * Autocomplete del buscador con teclado y a11y de combobox.
 *
 * Renderiza un input controlado y un listbox flotante con las
 * sugerencias devueltas por `searchSuggestions`. Cumple con el patrón
 * ARIA 1.2 de combobox: `role="combobox"` en el input, `aria-controls`
 * apuntando al listbox y `aria-activedescendant` cambiando con la
 * navegación por teclado.
 */
export function SearchAutocomplete({
  value,
  onValueChange,
  onSubmit,
  onSelectSuggestion,
  placeholder,
  inputAriaLabel,
  locale,
  inputId,
  renderAsForm = true,
  inputClassName,
}: SearchAutocompleteProps) {
  const t = useTranslations('searchAutocomplete');
  const {
    suggestions,
    isOpen,
    activeIndex,
    listboxId,
    optionId,
    inputRef,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    handleBlur,
    handleSelect,
    handleSubmit,
  } = useSearchAutocomplete(value, locale, onValueChange, onSubmit, onSelectSuggestion);

  const showClear = value.length > 0;

  // Cuando se renderiza con form, el botón limpiar y el icono viven dentro
  // del form. Cuando no, dejamos que el caller decorre el input a su gusto.
  const inputNode = (
    <input
      ref={inputRef}
      id={inputId}
      type="text"
      name="q"
      autoComplete="off"
      spellCheck={false}
      role="combobox"
      aria-expanded={isOpen}
      aria-controls={listboxId}
      aria-autocomplete="list"
      aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
      aria-label={inputAriaLabel ?? placeholder ?? t('inputLabel')}
      placeholder={placeholder ?? t('placeholder')}
      value={value}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={inputClassName ?? s.input}
      data-component="search-autocomplete-input"
    />
  );

  return (
    <div className={s.root} data-component="search-autocomplete">
      {renderAsForm ? (
        <form role="search" onSubmit={handleSubmit} className={s.form}>
          <span className={s.iconLeft} aria-hidden>
            <Search className="size-5" />
          </span>
          {inputNode}
          {showClear && (
            <button
              type="button"
              aria-label={t('clear')}
              onClick={() => {
                onValueChange('');
                inputRef.current?.focus();
              }}
              className={s.clearButton}
              data-component="search-autocomplete-clear"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </form>
      ) : (
        // En modo "sin form" el caller decide el wrapper visual (Hero).
        // El submit se gestiona desde el form padre con el handler que
        // hayan compuesto, pero también queremos que Enter cuando hay
        // sugerencia activa cierre la lista y emita la selección.
        inputNode
      )}

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('suggestionsLabel')}
          className={s.listbox}
          data-component="search-autocomplete-listbox"
        >
          <div className={s.listboxInner}>
            {suggestions.map((suggestion, index) => {
              const Icon = ICON_BY_TYPE[suggestion.type];
              const isActive = index === activeIndex;
              return (
                <Fragment key={suggestion.id}>
                  <li
                    id={optionId(index)}
                    role="option"
                    aria-selected={isActive}
                    className={cn(s.option, isActive ? s.optionActive : s.optionIdle)}
                    // Usamos `onMouseDown` en lugar de `onClick` para que
                    // dispare antes del `blur` del input y no se cierre
                    // el listbox antes de procesar la selección.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(suggestion);
                    }}
                    data-component={`search-autocomplete-option-${suggestion.type}`}
                  >
                    <span className={s.optionIcon} aria-hidden>
                      <Icon className="size-4" />
                    </span>
                    <span className={s.optionBody}>
                      <HighlightedLabel
                        label={suggestion.label}
                        matchRange={suggestion.matchRange}
                      />
                      {suggestion.sublabel && (
                        <span className={s.optionSublabel}>{suggestion.sublabel}</span>
                      )}
                    </span>
                    <span className={s.optionTypeBadge}>{t(`type.${suggestion.type}`)}</span>
                  </li>
                </Fragment>
              );
            })}
          </div>
        </ul>
      )}
    </div>
  );
}
