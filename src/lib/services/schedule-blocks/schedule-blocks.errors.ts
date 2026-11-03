/**
 * Errores tipados del dominio de bloqueos de agenda.
 *
 * Cada uno expone un `code` estable que la action devuelve tal cual: el
 * cliente elige el texto localizado sin parsear mensajes.
 */
import type { ScheduleBlockConflict } from './schedule-blocks.types';

export class ScheduleBlockInvalidInputError extends Error {
  readonly code = 'INVALID_INPUT';

  constructor(message = 'Invalid schedule block input.') {
    super(message);
    this.name = 'ScheduleBlockInvalidInputError';
  }
}

export class ScheduleBlockEndBeforeStartError extends Error {
  readonly code = 'END_BEFORE_START';

  constructor(message = 'Schedule block must end after it starts.') {
    super(message);
    this.name = 'ScheduleBlockEndBeforeStartError';
  }
}

export class ScheduleBlockInPastError extends Error {
  readonly code = 'IN_PAST';

  constructor(message = 'Schedule block cannot start in the past.') {
    super(message);
    this.name = 'ScheduleBlockInPastError';
  }
}

export class ScheduleBlockTooLongError extends Error {
  readonly code = 'TOO_LONG';

  constructor(message = 'Schedule block exceeds the maximum length.') {
    super(message);
    this.name = 'ScheduleBlockTooLongError';
  }
}

export class ScheduleBlockTooFarError extends Error {
  readonly code = 'TOO_FAR';

  constructor(message = 'Schedule block starts too far in the future.') {
    super(message);
    this.name = 'ScheduleBlockTooFarError';
  }
}

/**
 * El rango pisa reservas activas. Lleva la lista para que el panel
 * enseñe qué citas hay que mover o cancelar antes de bloquear.
 */
export class ScheduleBlockConflictError extends Error {
  readonly code = 'CONFLICT';

  constructor(
    readonly conflicts: ScheduleBlockConflict[],
    message = 'Schedule block overlaps active bookings.',
  ) {
    super(message);
    this.name = 'ScheduleBlockConflictError';
  }
}

export class ScheduleBlockNotFoundError extends Error {
  readonly code = 'NOT_FOUND';

  constructor(message = 'Schedule block not found.') {
    super(message);
    this.name = 'ScheduleBlockNotFoundError';
  }
}

/**
 * El negocio no tiene profesional activo al que ligar el bloqueo. No
 * debería pasar (el alta crea uno); para el panel es un fallo interno.
 */
export class ScheduleBlockNoProfessionalError extends Error {
  readonly code = 'INTERNAL';

  constructor(message = 'Provider has no active professional.') {
    super(message);
    this.name = 'ScheduleBlockNoProfessionalError';
  }
}
