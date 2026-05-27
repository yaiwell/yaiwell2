'use client';

import { useCallback, useState } from 'react';

/**
 * Estado del flujo de cancelación local.
 *
 * `idle` → no se ha hecho nada.
 * `cancelling` → el usuario ha pulsado "Cancelar" (simulación de spinner).
 * `cancelled` → ya simulamos la cancelación; ocultamos las acciones.
 *
 * En esta maqueta no hay API real, así que el estado vive solo en el
 * componente. En Fase 1 se sustituirá por una server action.
 */
type CancelState = 'idle' | 'cancelling' | 'cancelled';

/**
 * Hook que orquesta el botón "Cancelar" de la card.
 *
 * Encapsula el estado optimista de la mock para que el componente JSX
 * sea puramente declarativo y para que el comportamiento sea testeable.
 */
export function useBookingCardCancel() {
  const [state, setState] = useState<CancelState>('idle');

  const requestCancel = useCallback(() => {
    setState('cancelling');
    // En la mock no hay petición real; pasamos directamente a "cancelled"
    // tras un microtask para imitar UX asíncrona sin introducir timers.
    Promise.resolve().then(() => setState('cancelled'));
  }, []);

  return { state, requestCancel };
}
