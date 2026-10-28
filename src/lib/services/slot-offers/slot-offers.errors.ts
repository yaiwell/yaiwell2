/**
 * Errores tipados del dominio de huecos liberados.
 *
 * Cada uno expone un `code` estable para que las actions lo traduzcan
 * a un mensaje i18n sin parsear textos (CLAUDE.md §6.bis).
 */

export class SlotOfferNotFoundError extends Error {
  readonly code = 'SLOT_OFFER_NOT_FOUND';

  constructor(message = 'No existe la reserva u oferta indicada.') {
    super(message);
    this.name = 'SlotOfferNotFoundError';
  }
}

export class SlotOfferForbiddenError extends Error {
  readonly code = 'SLOT_OFFER_FORBIDDEN';

  constructor(message = 'Este hueco no pertenece a tu negocio.') {
    super(message);
    this.name = 'SlotOfferForbiddenError';
  }
}

/** Solo se libera el hueco de una reserva ya cancelada. */
export class SlotOfferSourceNotCancelledError extends Error {
  readonly code = 'SLOT_OFFER_SOURCE_NOT_CANCELLED';

  constructor(message = 'La reserva no está cancelada.') {
    super(message);
    this.name = 'SlotOfferSourceNotCancelledError';
  }
}

/** El hueco ya no se puede ofrecer: está ocupado o fuera de horario. */
export class SlotOfferSlotTakenError extends Error {
  readonly code = 'SLOT_OFFER_SLOT_TAKEN';

  constructor(message = 'El hueco ya no está libre.') {
    super(message);
    this.name = 'SlotOfferSlotTakenError';
  }
}

/**
 * Fuera de la ventana permitida: empieza en menos de 30 min (nadie
 * podría reservarlo) o, si es un hueco libre, en 2 h o más.
 */
export class SlotOfferOutsideWindowError extends Error {
  readonly code = 'SLOT_OFFER_OUTSIDE_WINDOW';

  constructor(message = 'El hueco está fuera de la ventana en la que se puede liberar.') {
    super(message);
    this.name = 'SlotOfferOutsideWindowError';
  }
}

/** Ya hay una oferta para esa reserva o para esa hora del profesional. */
export class SlotOfferAlreadyExistsError extends Error {
  readonly code = 'SLOT_OFFER_ALREADY_EXISTS';

  constructor(message = 'Este hueco ya está liberado.') {
    super(message);
    this.name = 'SlotOfferAlreadyExistsError';
  }
}

/** El servicio elegido no es del negocio, está pausado o no cabe. */
export class SlotOfferServiceInvalidError extends Error {
  readonly code = 'SLOT_OFFER_SERVICE_INVALID';

  constructor(message = 'El servicio elegido no se puede ofrecer en este hueco.') {
    super(message);
    this.name = 'SlotOfferServiceInvalidError';
  }
}
