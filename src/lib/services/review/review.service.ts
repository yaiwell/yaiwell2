/**
 * Servicio de reseñas.
 *
 * Centraliza las reglas de negocio descritas en CLAUDE.md §4.bis:
 *  - Solo el cliente del booking puede valorar.
 *  - Solo se valoran bookings en estado `completed`.
 *  - Ventana de 30 días desde `completedAt`.
 *  - Un booking → como mucho una reseña.
 *  - Solo el dueño del Provider puede responder.
 *
 * Los errores tipados (review.errors.ts) permiten al caller mapearlos
 * a status HTTP o copy localizado sin parsear strings.
 */

import { reviewRepository } from './review.repository';
import { createReviewSchema, replyToReviewSchema } from './review.validation';
import {
  BookingNotCompletedError,
  BookingNotFoundError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ReviewWindowExpiredError,
  UnauthorizedReplyError,
  UnauthorizedReviewerError,
} from './review.errors';

/**
 * Ventana en días desde `completedAt` durante la que se permite valorar.
 * Configurable a nivel de plataforma; en futuras versiones podría ser
 * por plan de suscripción (ver TODO.md).
 */
export const REVIEW_WINDOW_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Crea una valoración sobre un booking completado.
 *
 * Encadena las validaciones en orden de coste creciente: primero Zod
 * (síncrono), luego carga del booking, luego comprobaciones de reglas
 * de negocio. Solo al final tocamos la tabla de reseñas para insertar.
 *
 * @param input — datos sin validar provenientes de la capa de API.
 * @param authorId — `User.id` del cliente autenticado (de la sesión Clerk).
 * @returns la reseña recién creada.
 *
 * @throws BookingNotFoundError si el booking no existe.
 * @throws UnauthorizedReviewerError si el author no es el cliente del booking.
 * @throws BookingNotCompletedError si el booking no está en estado `completed`.
 * @throws ReviewWindowExpiredError si han pasado más de 30 días desde `completedAt`.
 * @throws ReviewAlreadyExistsError si ya existe una reseña para ese booking.
 */
export async function createReview(input: unknown, authorId: string) {
  const data = createReviewSchema.parse(input);

  const booking = await reviewRepository.findBookingWithProvider(data.bookingId);
  if (!booking) {
    throw new BookingNotFoundError();
  }

  // Autorización: solo el cliente original puede valorar su propia reserva.
  // Esta comprobación va antes del estado para no filtrar a terceros que
  // un determinado booking existe pero está en X estado.
  if (booking.clientId !== authorId) {
    throw new UnauthorizedReviewerError();
  }

  if (booking.status !== 'completed' || !booking.completedAt) {
    throw new BookingNotCompletedError();
  }

  // Ventana de 30 días desde que el profesional marcó la reserva como
  // completada. Pasado ese plazo bloqueamos para evitar reseñas con sesgo
  // de memoria muy posterior al servicio.
  const ageMs = Date.now() - booking.completedAt.getTime();
  if (ageMs > REVIEW_WINDOW_DAYS * MS_PER_DAY) {
    throw new ReviewWindowExpiredError();
  }

  // Duplicados: el modelo tiene @unique en bookingId, pero comprobamos
  // antes para emitir un error tipado en lugar de un fallo de constraint.
  const existing = await reviewRepository.findReviewByBookingId(data.bookingId);
  if (existing) {
    throw new ReviewAlreadyExistsError();
  }

  return reviewRepository.createReview({
    bookingId: data.bookingId,
    providerId: booking.providerId,
    authorId,
    rating: data.rating,
    text: data.text,
    photos: data.photos ?? [],
  });
}

/**
 * Publica la respuesta del proveedor a una reseña existente.
 *
 * @param input — datos sin validar provenientes de la capa de API.
 * @param providerUserId — `User.id` del dueño del Provider (sesión Clerk).
 * @returns la reseña actualizada con la respuesta.
 *
 * @throws ReviewNotFoundError si la reseña no existe.
 * @throws UnauthorizedReplyError si el usuario no es dueño del Provider.
 */
export async function replyToReview(input: unknown, providerUserId: string) {
  const data = replyToReviewSchema.parse(input);

  const review = await reviewRepository.findReviewById(data.reviewId);
  if (!review) {
    throw new ReviewNotFoundError();
  }

  // El dueño del Provider es la única identidad autorizada a responder.
  // No abrimos esta acción a otros profesionales del centro: la respuesta
  // pública es la "voz oficial" del negocio.
  if (review.provider.userId !== providerUserId) {
    throw new UnauthorizedReplyError();
  }

  return reviewRepository.updateReviewResponse(data.reviewId, data.response);
}
