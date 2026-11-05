/**
 * Errores tipados del reembolso por incidencia del centro.
 */

/**
 * Por qué una reserva no admite (ahora) el reembolso por incidencia:
 *  - `onsite`: se paga en el local; no hay cobro en la app que devolver.
 *  - `no_payment`: es online pero Stripe no tiene un cobro hecho.
 *  - `status`: no está `confirmed` ni `completed`.
 *  - `already_refunded`: el dinero ya se devolvió.
 *  - `in_queue`: su reembolso falló y sigue en la cola de /admin.
 *  - `in_progress`: lo acaban de cancelar por incidencia y la petición a
 *    Stripe puede seguir en vuelo; aún no se puede reanudar.
 *  - `partially_refunded`: ya hay un reembolso parcial hecho a mano.
 *  - `disputed`: el cargo tiene un contracargo.
 *  - `stripe_unavailable`: Stripe no respondió y no se puede comprobar.
 */
export type IncidentRefundIneligibleReason =
  | 'onsite'
  | 'no_payment'
  | 'status'
  | 'already_refunded'
  | 'in_queue'
  | 'in_progress'
  | 'partially_refunded'
  | 'disputed'
  | 'stripe_unavailable';

/** La reserva no admite el reembolso por incidencia del centro (ver `reason`). */
export class IncidentRefundNotEligibleError extends Error {
  readonly code = 'INCIDENT_REFUND_NOT_ELIGIBLE';

  constructor(
    readonly reason: IncidentRefundIneligibleReason,
    message = 'La reserva no admite el reembolso por incidencia del centro.',
  ) {
    super(message);
    this.name = 'IncidentRefundNotEligibleError';
  }
}

/**
 * Otra acción cambió la reserva desde que se leyó (el cron que completa, una
 * cancelación, otra petición de soporte). Esta llamada no ha movido dinero,
 * pero la otra puede haberlo hecho: hay que volver a buscar la reserva.
 */
export class IncidentRefundConflictError extends Error {
  readonly code = 'INCIDENT_REFUND_CONFLICT';

  constructor(message = 'Otra acción ha cambiado esta reserva.') {
    super(message);
    this.name = 'IncidentRefundConflictError';
  }
}
