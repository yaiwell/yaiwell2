'use client';

import { useCallback, useState } from 'react';

/**
 * Estado de apertura del diálogo de valoración.
 *
 * Se separa del JSX (§6.bis) aunque sea pequeño: el formulario cierra el
 * diálogo desde «Cancelar» y tras el éxito, y Radix lo cambia con
 * `Escape` o el botón de cerrar; todo pasa por aquí.
 */
export function useReviewDialog() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return { open, setOpen, close };
}
