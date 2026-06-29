import type { AppLocale } from '@/i18n/routing';

/**
 * Respuesta del proveedor a una reseña, tal como llega del servidor.
 *
 * Duplicado mínimo de `PanelReviewResponse` (que vive en el componente
 * hermano `ReceivedReviews`) para no acoplar los dos módulos por su
 * fichero de tipos: si en el futuro la firma de la respuesta cambia,
 * cada componente puede evolucionar a su ritmo.
 */
export interface ReviewReplySummary {
  text: string;
  respondedAt: Date;
}

/** Props del componente `ReviewReplyForm`. */
export interface ReviewReplyFormProps {
  /** Identificador de la reseña a responder. */
  reviewId: string;
  /** Locale activo del panel (para `replyToReviewAction` y formato de fecha). */
  locale: AppLocale;
  /**
   * Respuesta ya publicada. Si llega no nula, el componente renderiza la
   * card de respuesta existente y NO muestra el formulario (v1 no permite
   * editar respuestas).
   */
  existingResponse: ReviewReplySummary | null;
}

/**
 * Códigos de error que el formulario sabe traducir a copy localizado.
 * Mantenemos el set sincronizado con `ReviewsActionState.code`.
 */
export type ReplyErrorCode = 'VALIDATION' | 'REVIEW_NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL';
