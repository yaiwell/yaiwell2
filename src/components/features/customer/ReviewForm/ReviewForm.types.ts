/**
 * Tipos específicos del formulario de valoración del cliente.
 */

import type { SubmitReviewErrorCode } from '@/app/[locale]/mis-reservas/actions';

export type { SubmitReviewErrorCode };

/** Puntuación posible: escala de estrellas de la UI (1-5). */
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

/** Errores de validación en cliente, antes de llamar a la action. */
export type ReviewFieldError = 'RATING_REQUIRED' | 'TEXT_TOO_SHORT' | 'TEXT_TOO_LONG';

/** Props del diálogo que abre el formulario desde la card. */
export interface ReviewDialogProps {
  bookingId: string;
  /** Nombre del servicio ya resuelto al locale activo. */
  serviceName: string;
  providerName: string;
}

/** Props del formulario en sí (contenido del diálogo). */
export interface ReviewFormProps {
  bookingId: string;
  /** Cierra el contenedor (diálogo) desde «Cancelar» o tras el éxito. */
  onClose?: () => void;
}

/** Props del selector de estrellas (radio group 1-5). */
export interface StarRatingInputProps {
  value: ReviewRating | null;
  onChange: (value: ReviewRating) => void;
  disabled?: boolean;
  /**
   * Id del mensaje de error `RATING_REQUIRED`. Presente solo cuando hay
   * error: activa `aria-invalid` y lo enlaza con `aria-describedby`.
   */
  errorId?: string;
}
