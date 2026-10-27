'use client';

import { useCallback, useState } from 'react';

/**
 * A partir de esta longitud el texto se muestra recortado con «Ver más».
 * Unas tres líneas en móvil: suficiente para recordar qué se escribió sin
 * que una reseña larga empuje la card fuera de la pantalla.
 */
export const COLLAPSE_THRESHOLD = 240;

/**
 * Estado de plegado del texto de una reseña propia.
 *
 * @param text — texto completo de la reseña.
 * @returns si es plegable, si está expandido, el texto a mostrar y el toggle.
 */
export function useExistingReview(text: string) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = text.length > COLLAPSE_THRESHOLD;
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  // Cortamos por el último espacio para no partir una palabra a la mitad.
  const lastSpace = text.lastIndexOf(' ', COLLAPSE_THRESHOLD);
  const cut = lastSpace > 0 ? lastSpace : COLLAPSE_THRESHOLD;
  const preview = collapsible ? `${text.slice(0, cut)}…` : text;

  return {
    collapsible,
    expanded,
    visibleText: collapsible && !expanded ? preview : text,
    toggle,
  };
}
