/**
 * Errores tipados del dominio review.
 *
 * Cada error expone un `code` estable que el caller (API route, server
 * action, UI) puede usar para mapear a status HTTP o copy localizado
 * sin depender de parsear strings.
 *
 * Las reglas que disparan estos errores están descritas en §4.bis de
 * CLAUDE.md (sección "Valoraciones").
 */

export class BookingNotFoundError extends Error {
  readonly code = 'BOOKING_NOT_FOUND';

  constructor(message = 'Reserva no encontrada.') {
    super(message);
    this.name = 'BookingNotFoundError';
  }
}

/**
 * Error lanzado cuando el booking existe pero su estado no es
 * `completed`. Solo se permite valorar reservas que el profesional
 * ha marcado como finalizadas desde su panel.
 */
export class BookingNotCompletedError extends Error {
  readonly code = 'BOOKING_NOT_COMPLETED';

  constructor(message = 'No se puede valorar: la reserva no está marcada como completada.') {
    super(message);
    this.name = 'BookingNotCompletedError';
  }
}

/**
 * Error lanzado cuando han pasado más de 30 días desde `completedAt`.
 * La ventana es configurable mediante `REVIEW_WINDOW_DAYS` en el service.
 */
export class ReviewWindowExpiredError extends Error {
  readonly code = 'REVIEW_WINDOW_EXPIRED';

  constructor(message = 'La ventana de 30 días para valorar esta reserva ha expirado.') {
    super(message);
    this.name = 'ReviewWindowExpiredError';
  }
}

/**
 * Error lanzado cuando el usuario autenticado no coincide con el
 * cliente original de la reserva. Evita que un tercero valore en
 * nombre de otro.
 */
export class UnauthorizedReviewerError extends Error {
  readonly code = 'UNAUTHORIZED_REVIEWER';

  constructor(message = 'No autorizado para valorar esta reserva.') {
    super(message);
    this.name = 'UnauthorizedReviewerError';
  }
}

/**
 * Error lanzado al intentar crear una segunda reseña sobre el mismo
 * booking. La FK `bookingId` es @unique en BD; este error normaliza
 * la respuesta antes de que Prisma lance un fallo de constraint.
 */
export class ReviewAlreadyExistsError extends Error {
  readonly code = 'REVIEW_ALREADY_EXISTS';

  constructor(message = 'Esta reserva ya tiene una valoración.') {
    super(message);
    this.name = 'ReviewAlreadyExistsError';
  }
}

export class ReviewNotFoundError extends Error {
  readonly code = 'REVIEW_NOT_FOUND';

  constructor(message = 'Valoración no encontrada.') {
    super(message);
    this.name = 'ReviewNotFoundError';
  }
}

/**
 * Error lanzado cuando el usuario que intenta responder a una reseña
 * no es el dueño del Provider asociado. Solo el `Provider.userId`
 * puede publicar la respuesta pública.
 */
export class UnauthorizedReplyError extends Error {
  readonly code = 'UNAUTHORIZED_REPLY';

  constructor(message = 'No autorizado para responder a esta valoración.') {
    super(message);
    this.name = 'UnauthorizedReplyError';
  }
}
