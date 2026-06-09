'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { searchSuggestions, type Suggestion } from '@/lib/fake-data/search-suggestions';

import type { UseSearchAutocompleteResult } from './SearchAutocomplete.types';

/**
 * Retardo del debounce en ms para no calcular sugerencias en cada keystroke.
 * Está en el rango 250-300 recomendado por la tarea: 250 ms da feedback ágil
 * sin saturar de renders cuando el usuario teclea rápido.
 */
const DEBOUNCE_MS = 250;

/**
 * Hook orquestador del autocomplete del buscador.
 *
 * Responsabilidades:
 *  - Mantener la lista de sugerencias actualizada con debounce.
 *  - Gestionar la apertura/cierre del dropdown.
 *  - Navegación con teclado (↑/↓/Enter/Esc) sobre las sugerencias.
 *  - IDs estables para `aria-controls` / `aria-activedescendant`.
 *
 * El input es controlado por el caller para que el valor pueda venir
 * de la URL en `/buscar` o de un estado local en la landing.
 */
export function useSearchAutocomplete(
  value: string,
  locale: 'es' | 'ca' | 'en' | 'de',
  onValueChange: (next: string) => void,
  onSubmit: (value: string) => void,
  onSelectSuggestion: (suggestion: Suggestion) => void,
): UseSearchAutocompleteResult {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Permite suprimir el dropdown justo después de seleccionar una sugerencia
  // o pulsar Esc; se reactivará en el siguiente cambio de valor manual.
  const [suppressOpen, setSuppressOpen] = useState(false);

  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const optionId = useCallback((index: number) => `${reactId}-option-${index}`, [reactId]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Debounce: el efecto vive en cliente y limpia el timer al re-disparar.
  // Cuando `suppressOpen` está activo no programamos el timeout y dejamos
  // las sugerencias previas intactas: el `useMemo` de `isOpen` ya las oculta
  // y el siguiente keystroke (handleInputChange) reabrirá el dropdown.
  // Evitamos `setState` síncrono dentro del efecto (regla react-hooks/purity).
  useEffect(() => {
    if (suppressOpen) return;
    const handle = window.setTimeout(() => {
      const next = searchSuggestions(value, locale);
      setSuggestions(next);
      // Reset del índice activo cuando cambia la lista para evitar
      // quedarnos apuntando a un índice fuera de rango.
      setActiveIndex(next.length > 0 ? 0 : -1);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [value, locale, suppressOpen]);

  // Cuando el dropdown está suprimido no exponemos las sugerencias previas:
  // así los listeners/aria-controls reflejan un listbox vacío y los tests
  // ven el estado correcto sin depender del orden de los renders del efecto.
  const visibleSuggestions = suppressOpen ? [] : suggestions;

  const isOpen = useMemo(
    () => isFocused && !suppressOpen && visibleSuggestions.length > 0,
    [isFocused, suppressOpen, visibleSuggestions.length],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Si el usuario edita tras una selección, reabrimos el dropdown.
      setSuppressOpen(false);
      onValueChange(e.target.value);
    },
    [onValueChange],
  );

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      setSuppressOpen(true);
      setActiveIndex(-1);
      onSelectSuggestion(suggestion);
    },
    [onSelectSuggestion],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // Si hay una sugerencia activa y el dropdown está abierto, prevalece
      // la selección sobre el submit (paridad con combobox de iOS/macOS).
      if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelect(suggestions[activeIndex]);
        return;
      }
      setSuppressOpen(true);
      onSubmit(value.trim());
    },
    [activeIndex, handleSelect, isOpen, onSubmit, suggestions, value],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (suggestions.length === 0) return;
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (suggestions.length === 0) return;
        setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        return;
      }

      if (e.key === 'Enter') {
        // Si hay sugerencia activa, la selección prevalece sobre el submit
        // del form padre (importante cuando renderAsForm=false y el input
        // vive dentro de otro form, como en el Hero).
        if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
          e.preventDefault();
          handleSelect(suggestions[activeIndex]);
        }
        return;
      }

      if (e.key === 'Escape') {
        // Esc cierra el dropdown sin perder el texto. Si ya está cerrado,
        // hacemos blur para liberar el foco (UX consistente con Safari).
        if (isOpen) {
          e.preventDefault();
          setSuppressOpen(true);
          setActiveIndex(-1);
        } else {
          inputRef.current?.blur();
        }
        return;
      }
    },
    [activeIndex, handleSelect, isOpen, suggestions],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Pequeño retraso para que un click sobre una opción se procese
    // antes de cerrar el listbox por blur.
    window.setTimeout(() => setIsFocused(false), 120);
  }, []);

  return {
    suggestions: visibleSuggestions,
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
  };
}
