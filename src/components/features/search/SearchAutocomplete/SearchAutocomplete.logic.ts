'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { fetchSuggestions, type Suggestion } from '@/lib/services/suggestions';

import type { UseSearchAutocompleteResult } from './SearchAutocomplete.types';

/**
 * Retardo del debounce en ms para no calcular sugerencias en cada keystroke.
 * 250 ms da feedback ágil sin saturar de fetches cuando el usuario teclea
 * rápido (también es el rango recomendado por la tarea original).
 */
const DEBOUNCE_MS = 250;

/**
 * Mínimo de caracteres para disparar la query. Coincide con la heurística
 * histórica del autocomplete (`searchSuggestions` ignoraba <2 chars):
 * mantenerla aquí evita hacer ida y vuelta a `/api/suggestions` para
 * términos casi vacíos.
 */
const MIN_QUERY_LENGTH = 2;

/**
 * Hook orquestador del autocomplete del buscador.
 *
 * Responsabilidades:
 *  - Pedir sugerencias al endpoint `/api/suggestions` con debounce.
 *  - Cachear y deduplicar peticiones vía TanStack Query (cuyo provider
 *    se monta en el layout root).
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
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Permite suprimir el dropdown justo después de seleccionar una sugerencia
  // o pulsar Esc; se reactivará en el siguiente cambio de valor manual.
  const [suppressOpen, setSuppressOpen] = useState(false);

  // Valor debounced que alimenta la queryKey. Lo mantenemos separado del
  // input para que el usuario vea su texto al instante pero las requests
  // solo se disparen tras el debounce.
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedValue(value), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value]);

  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const optionId = useCallback((index: number) => `${reactId}-option-${index}`, [reactId]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedDebounced = debouncedValue.trim();
  const shouldQuery = !suppressOpen && trimmedDebounced.length >= MIN_QUERY_LENGTH;

  // TanStack Query maneja cache, dedupe, cancelación vía `signal` y reuso
  // si el usuario borra y vuelve a teclear lo mismo dentro de `staleTime`.
  // `placeholderData: (prev) => prev` evita el parpadeo del dropdown
  // mientras llega la nueva respuesta cuando el usuario sigue tipeando.
  const { data } = useQuery({
    queryKey: ['suggestions', trimmedDebounced, locale],
    queryFn: ({ signal }) =>
      fetchSuggestions({ query: trimmedDebounced, language: locale, signal }),
    enabled: shouldQuery,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    // Si el fetch falla degradamos a lista vacía y dejamos que la UI
    // simplemente esconda el dropdown — sin toast, sin throw.
    retry: false,
  });

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!shouldQuery) return [];
    return data?.results ?? [];
  }, [data, shouldQuery]);

  // Reset del índice activo cuando cambia el tamaño de la lista. Aplicamos
  // el patrón oficial de React "ajustar estado durante el render"
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // para no caer en `setState` dentro de `useEffect`, que React 19 ahora
  // sanciona con el lint `react-hooks/set-state-in-effect`.
  const [prevSuggestionsLength, setPrevSuggestionsLength] = useState(suggestions.length);
  if (prevSuggestionsLength !== suggestions.length) {
    setPrevSuggestionsLength(suggestions.length);
    setActiveIndex(suggestions.length > 0 ? 0 : -1);
  }

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
