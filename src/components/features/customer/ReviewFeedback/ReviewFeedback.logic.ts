'use client';

import { createContext, useCallback, useContext, useState } from 'react';

/**
 * Anuncia un aviso a nivel de página. Sin `message` muestra el de
 * «valoración publicada»; la cancelación de una reserva pasa el suyo.
 */
export type AnnounceFeedback = (message?: string) => void;

/**
 * Contexto que permite a los diálogos de una card (valorar, cancelar)
 * anunciar su resultado en un aviso a nivel de página.
 *
 * Hace falta porque, al terminar, la action revalida `/mis-reservas` y la
 * card (con su diálogo) cambia de sección y se desmonta: un mensaje
 * guardado en el estado del diálogo desaparecería con él. Este estado
 * vive por encima del listado y React lo conserva tras el refresco del RSC.
 */
export const ReviewFeedbackContext = createContext<AnnounceFeedback | null>(null);

/**
 * Devuelve la función que anuncia el aviso, o `null` si el diálogo se
 * renderiza fuera de `ReviewFeedbackProvider` (tests).
 */
export function useReviewFeedback(): AnnounceFeedback | null {
  return useContext(ReviewFeedbackContext);
}

/**
 * Estado del aviso: oculto (`null`) o visible con su texto. La cadena
 * vacía representa el aviso por defecto («valoración publicada»).
 */
export function useReviewFeedbackState() {
  const [message, setMessage] = useState<string | null>(null);
  const announce = useCallback<AnnounceFeedback>((text) => setMessage(text ?? ''), []);
  const dismiss = useCallback(() => setMessage(null), []);
  return { visible: message !== null, message, announce, dismiss };
}
