/**
 * Errores tipados de los límites de servicios por plan.
 */

/** El negocio ya tiene publicados tantos servicios como permite su plan. */
export class PlanServiceLimitReachedError extends Error {
  readonly code = 'PLAN_LIMIT_REACHED';
  constructor(
    readonly maxServices: number,
    message = 'Service limit of the current plan reached.',
  ) {
    super(message);
    this.name = 'PlanServiceLimitReachedError';
  }
}

/** No existe el negocio cuyo límite se quiere comprobar. */
export class PlanLimitProviderNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';
  constructor(message = 'Provider not found while checking plan limits.') {
    super(message);
    this.name = 'PlanLimitProviderNotFoundError';
  }
}
