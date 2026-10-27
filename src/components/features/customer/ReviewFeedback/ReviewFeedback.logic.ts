'use client';

import { createContext, useCallback, useContext, useState } from 'react';

/**
 * Contexto que permite al formulario de valoración anunciar el éxito en
 * un aviso a nivel de página.
 *
 * Hace falta porque, al publicar, la action revalida `/mis-reservas` y la
 * card (con su diálogo) se desmonta: un mensaje de éxito guardado en el
 * estado del formulario desaparecería con él. Este estado vive por
 * encima del listado y React lo conserva tras el refresco del RSC.
 */
export const ReviewFeedbackContext = createContext<(() => void) | null>(null);

/**
 * Devuelve la función que anuncia «valoración publicada», o `null` si el
 * formulario se renderiza fuera de `ReviewFeedbackProvider` (tests).
 */
export function useReviewFeedback(): (() => void) | null {
  return useContext(ReviewFeedbackContext);
}

/** Estado del aviso: visible u oculto, con sus dos transiciones. */
export function useReviewFeedbackState() {
  const [visible, setVisible] = useState(false);
  const announce = useCallback(() => setVisible(true), []);
  const dismiss = useCallback(() => setVisible(false), []);
  return { visible, announce, dismiss };
}
