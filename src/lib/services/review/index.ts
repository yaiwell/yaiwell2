/**
 * API pública del módulo de reseñas.
 *
 * El resto de la app debe importar siempre desde aquí, nunca desde los
 * archivos internos. Mantener esta fachada estable simplifica refactors
 * (mover código entre archivos) sin tocar a los consumidores.
 */

export { createReview, replyToReview, REVIEW_WINDOW_DAYS } from './review.service';
export { reviewRepository } from './review.repository';
export { createReviewSchema, replyToReviewSchema } from './review.validation';
export {
  BookingNotCompletedError,
  BookingNotFoundError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewWindowExpiredError,
  UnauthorizedReplyError,
  UnauthorizedReviewerError,
} from './review.errors';
export type { CreateReviewInput, ReplyToReviewInput, ReviewSummary } from './review.types';
export type { CreateReviewParsed, ReplyToReviewParsed } from './review.validation';
