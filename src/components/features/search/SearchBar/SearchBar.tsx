'use client';

import { SearchAutocomplete } from '../SearchAutocomplete';
import { useSearchBar } from './SearchBar.logic';
import type { SearchBarProps } from './SearchBar.types';

/**
 * Campo de búsqueda principal de la vertical `/buscar`.
 *
 * Es una fina capa sobre `SearchAutocomplete` que mantiene la API
 * original (`initialValue` + `onSubmit`) y deriva el valor controlado
 * desde la URL. Toda la UX (debounce, dropdown, teclado, a11y) vive
 * en el autocomplete, así no duplicamos lógica.
 */
export function SearchBar({
  initialValue = '',
  onSubmit,
  locale,
  onSelectSuggestion,
}: SearchBarProps) {
  const { value, setValue, handleSubmit } = useSearchBar(initialValue, onSubmit);

  return (
    <div data-component="search-bar">
      <SearchAutocomplete
        value={value}
        onValueChange={setValue}
        onSubmit={handleSubmit}
        onSelectSuggestion={(suggestion) => {
          // Si el caller no maneja la selección, hacemos un fallback
          // razonable: copiamos el label al input y disparamos submit
          // para que la URL se actualice con un texto coherente.
          if (onSelectSuggestion) {
            onSelectSuggestion(suggestion);
          } else {
            setValue(suggestion.label);
            handleSubmit(suggestion.label);
          }
        }}
        locale={locale}
      />
    </div>
  );
}
