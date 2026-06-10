/**
 * Errores tipados del dominio de onboarding del proveedor.
 *
 * Cada clase expone un `code` estable que el route handler usará para
 * traducir a status HTTP y copy localizado sin parsear strings, en
 * línea con el patrón del resto de servicios (ver `booking.errors.ts`).
 */

/**
 * El slug elegido por el usuario ya está ocupado. Se dispara cuando
 * la INSERT con `ON CONFLICT (slug) DO NOTHING` no devuelve fila — es
 * la carrera contra otro proveedor que cogió el mismo slug entre el
 * check de disponibilidad y el submit final.
 */
export class SlugAlreadyTakenError extends Error {
  readonly code = 'SLUG_ALREADY_TAKEN';

  constructor(message = 'El slug ya está en uso.') {
    super(message);
    this.name = 'SlugAlreadyTakenError';
  }
}

/**
 * El plan free no está sembrado en BD. No debería pasar nunca en
 * runtime porque `seed.ts` lo crea, pero lo modelamos como error
 * tipado para que el incidente sea fácil de depurar (vs. un null
 * propagándose hasta una violación de FK).
 */
export class FreePlanNotSeededError extends Error {
  readonly code = 'FREE_PLAN_NOT_SEEDED';

  constructor(message = 'El plan free no está sembrado en la base de datos.') {
    super(message);
    this.name = 'FreePlanNotSeededError';
  }
}

/**
 * El usuario ya tiene un Provider asociado y trata de crear otro a
 * través del wizard de onboarding (que solo cubre el alta inicial).
 * Para dar de alta centros adicionales irá un flujo de "multi-centro"
 * propio (Fase 1) — no este servicio.
 */
export class OnboardingAlreadyCompleteError extends Error {
  readonly code = 'ONBOARDING_ALREADY_COMPLETE';

  constructor(message = 'El usuario ya completó el onboarding.') {
    super(message);
    this.name = 'OnboardingAlreadyCompleteError';
  }
}

/**
 * Se intenta operar sobre un Provider que no existe o no pertenece al
 * usuario autenticado. Reutilizamos un único error para ambos casos
 * (not found y forbidden) para no filtrar la existencia de proveedores
 * ajenos.
 */
export class ProviderForOnboardingNotFoundError extends Error {
  readonly code = 'PROVIDER_FOR_ONBOARDING_NOT_FOUND';

  constructor(message = 'Provider no encontrado para este usuario.') {
    super(message);
    this.name = 'ProviderForOnboardingNotFoundError';
  }
}

/**
 * Se intenta crear el primer servicio con una `categoryId` que no
 * existe en la tabla `categories`. Lo capturamos antes de tocar el
 * INSERT para devolver un código semántico en lugar de un error de FK.
 */
export class CategoryNotFoundError extends Error {
  readonly code = 'CATEGORY_NOT_FOUND';

  constructor(message = 'Categoría no encontrada.') {
    super(message);
    this.name = 'CategoryNotFoundError';
  }
}

/**
 * Se intenta seleccionar un plan cuyo `tier` no existe en BD. Mismo
 * razonamiento que `FreePlanNotSeededError`, pero genérico para los
 * tres tiers de pago.
 */
export class PlanTierNotFoundError extends Error {
  readonly code = 'PLAN_TIER_NOT_FOUND';

  constructor(message = 'Plan no encontrado para el tier solicitado.') {
    super(message);
    this.name = 'PlanTierNotFoundError';
  }
}
