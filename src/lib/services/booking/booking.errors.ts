/**
 * Errores tipados del dominio booking.
 *
 * Siguen el patrón del resto del proyecto: cada error expone un `code`
 * estable que el caller (API route, server action, UI) puede usar para
 * decidir el copy a mostrar o el status HTTP a devolver, sin parsear
 * strings.
 *
 * Las reglas de negocio que disparan estos errores están descritas en
 * §4.bis de CLAUDE.md (cancelaciones >=2h, valoraciones solo si
 * `completed`, etc.).
 */

export class SlotUnavailableError extends Error {
  readonly code = 'SLOT_UNAVAILABLE';

  constructor(message = 'El slot ya no está disponible.') {
    super(message);
    this.name = 'SlotUnavailableError';
  }
}

export class BookingNotFoundError extends Error {
  readonly code = 'BOOKING_NOT_FOUND';

  constructor(message = 'Reserva no encontrada.') {
    super(message);
    this.name = 'BookingNotFoundError';
  }
}

export class BookingTooLateToCancelError extends Error {
  readonly code = 'BOOKING_TOO_LATE_TO_CANCEL';

  constructor(
    message = 'No se puede cancelar la reserva: faltan menos de 2 horas para el inicio.',
  ) {
    super(message);
    this.name = 'BookingTooLateToCancelError';
  }
}

export class ServiceNotFoundError extends Error {
  readonly code = 'SERVICE_NOT_FOUND';

  constructor(message = 'Servicio no encontrado.') {
    super(message);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Error lanzado al intentar reservar un servicio pausado por el dueño
 * (`Service.isActive = false`). Los servicios pausados desaparecen de
 * búsqueda y de la ficha pública del proveedor, pero el caller podría
 * llegar aquí con una URL stale, un deeplink antiguo o una carrera
 * entre el render de la ficha y el toggle del proveedor. Lo cortamos
 * en el borde del servicio para no crear reservas huérfanas.
 */
export class ServicePausedError extends Error {
  readonly code = 'SERVICE_PAUSED';

  constructor(message = 'El servicio está pausado y no admite reservas.') {
    super(message);
    this.name = 'ServicePausedError';
  }
}

export class UnauthorizedCancellationError extends Error {
  readonly code = 'UNAUTHORIZED_CANCELLATION';

  constructor(message = 'No autorizado para cancelar esta reserva.') {
    super(message);
    this.name = 'UnauthorizedCancellationError';
  }
}

/**
 * Error lanzado al intentar marcar como completada una reserva cuyo
 * estado actual no lo permite. Solo se puede pasar a `completed` desde
 * `confirmed`; saltar de `pending` directamente queda bloqueado para
 * evitar marcar como atendido un servicio que aún no se ha pagado.
 */
export class BookingNotConfirmedError extends Error {
  readonly code = 'BOOKING_NOT_CONFIRMED';

  constructor(message = 'La reserva debe estar confirmada para marcarse como completada.') {
    super(message);
    this.name = 'BookingNotConfirmedError';
  }
}
