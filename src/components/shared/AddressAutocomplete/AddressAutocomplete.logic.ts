'use client';

import { useQuery } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import type { GeocodingResult } from '@/lib/integrations/mapbox';

import type { AddressAutocompleteProps, AddressSelection } from './AddressAutocomplete.types';

/**
 * Retardo del debounce en ms para no disparar fetch en cada tecla.
 * 300 ms es el valor pedido por el ticket y un buen compromiso entre
 * percepción de respuesta y coste de requests.
 */
const DEBOUNCE_MS = 300;

/**
 * Mínimo de caracteres para llamar al geocoder. Por debajo de 3 los
 * candidatos son inútiles (Mapbox tampoco devuelve nada interesante).
 */
const MIN_QUERY_LENGTH = 3;

/**
 * Construye un `AddressSelection` a partir de un `GeocodingResult`.
 * Aislado en función para que el tipo se valide en un único punto.
 */
function buildSelection(result: GeocodingResult): AddressSelection {
  return {
    fullAddress: result.fullAddress,
    lat: result.lat,
    lng: result.lng,
    kind: result.kind,
  };
}

/**
 * Respuesta serializada del endpoint `/api/geocoding/forward`.
 * Incluida aquí para que el queryFn no dependa de un tipo importado
 * desde la capa de servicios — el contrato vive en la API pública.
 */
interface ForwardApiResponse {
  results?: GeocodingResult[];
  error?: { code: string; message?: string };
}

/**
 * Construye la URL del endpoint forward respetando solo los parámetros
 * realmente definidos. Evita ensuciar la queryKey con `undefined`.
 */
function buildForwardUrl(params: {
  q: string;
  language: string;
  country?: string;
  proximity?: { lat: number; lng: number };
}): string {
  const search = new URLSearchParams({ q: params.q, language: params.language });
  if (params.country) search.set('country', params.country);
  if (params.proximity) {
    search.set('proximityLat', String(params.proximity.lat));
    search.set('proximityLng', String(params.proximity.lng));
  }
  return `/api/geocoding/forward?${search.toString()}`;
}

/**
 * Hook que centraliza el estado del autocomplete de direcciones.
 *
 * Responsabilidades:
 *  - Mantener el `value` del input (controlado internamente).
 *  - Aplicar debounce antes de disparar la query a `/api/geocoding/forward`.
 *  - Gestionar apertura/cierre del listbox, índice activo y navegación
 *    con teclado siguiendo el patrón ARIA 1.2 de combobox.
 *  - Exponer `isLoading` / `isError` para que el JSX pinte estados.
 *
 * No expone los `setState` directamente: solo handlers de alto nivel
 * para que el componente sea puramente presentacional.
 */
export function useAddressAutocomplete(props: AddressAutocompleteProps) {
  const { locale, country, proximity, initialValue = '', onSelect, onClear } = props;

  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // `suppressOpen` se activa justo después de elegir/cerrar para evitar
  // que el dropdown reaparezca por la query previa hasta que el usuario
  // vuelva a editar el texto.
  const [suppressOpen, setSuppressOpen] = useState(false);

  // Debounce del valor del input. Solo dispara `setDebouncedValue` tras
  // `DEBOUNCE_MS` de inactividad de tecleo.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedValue(value), DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value]);

  const reactId = useId();
  const inputId = props.id ?? `${reactId}-input`;
  const listboxId = `${reactId}-listbox`;
  const optionId = useCallback((index: number) => `${reactId}-option-${index}`, [reactId]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const trimmedDebounced = debouncedValue.trim();
  const shouldQuery = !suppressOpen && trimmedDebounced.length >= MIN_QUERY_LENGTH;

  // TanStack Query gestiona cache, cancelación vía `signal` y dedupe.
  // `placeholderData: keep previous` evita el parpadeo del listbox
  // mientras se resuelve la siguiente petición.
  const queryProximityKey = proximity ? `${proximity.lat},${proximity.lng}` : null;
  const { data, isFetching, isError } = useQuery<ForwardApiResponse>({
    queryKey: ['geocoding-forward', trimmedDebounced, locale, country ?? null, queryProximityKey],
    queryFn: async ({ signal }) => {
      const url = buildForwardUrl({
        q: trimmedDebounced,
        language: locale,
        country,
        proximity,
      });
      const response = await fetch(url, { signal });
      if (!response.ok) {
        // Lanzamos para que TanStack lo marque como error; el JSX lo
        // traduce a un mensaje localizado.
        throw new Error(`forward geocoding failed: ${response.status}`);
      }
      return (await response.json()) as ForwardApiResponse;
    },
    enabled: shouldQuery,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    retry: false,
  });

  const results = useMemo<GeocodingResult[]>(() => {
    if (!shouldQuery) return [];
    return data?.results ?? [];
  }, [data, shouldQuery]);

  // Reset del índice activo cuando cambia el tamaño de la lista. Patrón
  // oficial de React de "ajustar estado durante el render" para evitar
  // setState en useEffect (penalizado por el lint react-hooks/set-state-in-effect
  // en React 19).
  const [prevResultsLength, setPrevResultsLength] = useState(results.length);
  if (prevResultsLength !== results.length) {
    setPrevResultsLength(results.length);
    setActiveIndex(results.length > 0 ? 0 : -1);
  }

  // Visibilidad del listbox: solo si está enfocado, no se ha suprimido,
  // y hay algo que mostrar (resultados, loading o error).
  const hasContent = results.length > 0 || isFetching || isError;
  const isOpen = isFocused && !suppressOpen && hasContent;

  // Handlers expuestos al JSX.
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    // Al editar reabrimos el listbox aunque el usuario acabara de elegir.
    setSuppressOpen(false);
    setValue(e.target.value);
  }, []);

  const handleSelectResult = useCallback(
    (result: GeocodingResult) => {
      // Bloqueamos refetch sincronizando `debouncedValue` con el texto que
      // acabamos de pintar; así la próxima ronda de useEffect no dispara
      // otra petición con la misma query.
      const selection = buildSelection(result);
      setValue(selection.fullAddress);
      setDebouncedValue(selection.fullAddress);
      setSuppressOpen(true);
      setActiveIndex(-1);
      onSelect(selection);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (results.length === 0) return;
        setActiveIndex((prev) => (prev + 1) % results.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.length === 0) return;
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
        return;
      }
      if (e.key === 'Enter') {
        if (isOpen && activeIndex >= 0 && results[activeIndex]) {
          e.preventDefault();
          handleSelectResult(results[activeIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setSuppressOpen(true);
          setActiveIndex(-1);
        } else {
          inputRef.current?.blur();
        }
        return;
      }
      if (e.key === 'Tab') {
        // Tab cierra el listbox pero deja que el navegador haga su
        // gestión natural del foco (sin preventDefault).
        setSuppressOpen(true);
      }
    },
    [activeIndex, handleSelectResult, isOpen, results],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Pequeño delay para que un click sobre una opción se procese antes
    // de que el blur cierre el listbox y deshaga la selección.
    window.setTimeout(() => setIsFocused(false), 120);
  }, []);

  const handleClear = useCallback(() => {
    setValue('');
    setDebouncedValue('');
    setSuppressOpen(false);
    setActiveIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  }, [onClear]);

  return {
    value,
    inputId,
    listboxId,
    optionId,
    inputRef,
    results,
    activeIndex,
    isOpen,
    isLoading: shouldQuery && isFetching,
    isError: shouldQuery && isError,
    handleInputChange,
    handleKeyDown,
    handleFocus,
    handleBlur,
    handleSelectResult,
    handleClear,
  };
}
