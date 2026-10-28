'use client';

import { createContext, useCallback, useContext, useState } from 'react';

import type { OpenReleaseSlotPrompt, ReleaseSlotRequest } from './ReleaseSlotDialog.types';

/**
 * Contexto que permite abrir el diálogo de liberar hueco desde
 * cualquier botón del calendario.
 *
 * El diálogo vive arriba del árbol (en la página) y no dentro del botón
 * de cancelar: al cancelar, `revalidatePath` re-renderiza la página, la
 * reserva pasa a `cancelled` y el botón desaparece. Si el diálogo fuese
 * suyo, se desmontaría justo cuando hay que preguntar por el hueco.
 */
export const ReleaseSlotPromptContext = createContext<OpenReleaseSlotPrompt | null>(null);

/**
 * Devuelve la función que abre el diálogo, o `null` si no hay proveedor
 * montado (tests, vistas sin calendario): quien la use decide entonces
 * comportarse como antes.
 */
export function useReleaseSlotPrompt(): OpenReleaseSlotPrompt | null {
  return useContext(ReleaseSlotPromptContext);
}

/** Estado del proveedor: petición abierta y clave para reiniciar el formulario. */
export function useReleaseSlotPromptState() {
  const [request, setRequest] = useState<ReleaseSlotRequest | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const open = useCallback<OpenReleaseSlotPrompt>((next) => {
    setRequestKey((k) => k + 1);
    setRequest(next);
  }, []);

  const close = useCallback(() => setRequest(null), []);

  return { request, requestKey, open, close };
}
