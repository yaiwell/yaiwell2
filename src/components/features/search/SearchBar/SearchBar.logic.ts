'use client';

import { useCallback, useState } from 'react';

/**
 * Hook de estado local del SearchBar.
 *
 * El input mantiene su propio valor (UX responsive: la tecla aparece
 * al instante) y solo emite hacia arriba al confirmar (Enter, click
 * sobre una sugerencia o botón "limpiar"). El padre actualiza la URL
 * con ese valor; cuando la URL cambia, sincronizamos el input siguiendo
 * el patrón recomendado por React 19 ("derived state durante el render",
 * no en `useEffect`).
 *
 * Patrón:
 *   - Guardamos el último `initialValue` que hemos visto en `prev`.
 *   - Si cambia entre renders, hacemos `setValue` ANTES del return.
 *   - React aborta el render en curso y vuelve a empezar con el nuevo
 *     estado, evitando el efecto en cascada que penalizaría
 *     `react-hooks/set-state-in-effect`.
 */
export function useSearchBar(initialValue: string, onSubmit: (value: string) => void) {
  const [value, setValue] = useState(initialValue);
  const [prevInitial, setPrevInitial] = useState(initialValue);

  if (initialValue !== prevInitial) {
    setPrevInitial(initialValue);
    setValue(initialValue);
  }

  const handleSubmit = useCallback(
    (submittedValue: string) => {
      onSubmit(submittedValue.trim());
    },
    [onSubmit],
  );

  return {
    value,
    setValue,
    handleSubmit,
  };
}
