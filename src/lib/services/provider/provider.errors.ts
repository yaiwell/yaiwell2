/**
 * Errores tipados del dominio `provider`.
 *
 * Exponen un `code` estable para que las server actions traduzcan a copy
 * localizado sin parsear strings, en línea con el patrón del resto de
 * servicios (`booking.errors.ts`, `provider-onboarding.errors.ts`).
 */

/**
 * No existe Provider con el `id` indicado. En el contexto del panel
 * solo debería darse en una carrera muy improbable: el provider se
 * borró entre `requireCurrentProvider` y el update.
 */
export class ProviderNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';

  constructor(message = 'Provider no encontrado.') {
    super(message);
    this.name = 'ProviderNotFoundError';
  }
}

/**
 * La validación Zod del input del update ha fallado.
 *
 * Wrapper opcional sobre `ZodError` para mantener el mismo estilo de
 * códigos que el resto del módulo. Las server actions también pueden
 * capturar directamente `ZodError` si necesitan acceder a las issues.
 */
export class ProviderValidationError extends Error {
  readonly code = 'PROVIDER_VALIDATION';

  constructor(message = 'Los datos del proveedor no son válidos.') {
    super(message);
    this.name = 'ProviderValidationError';
  }
}

/**
 * El Provider no tiene ningún Professional asociado.
 *
 * En el wizard de onboarding se crea siempre 1 Professional al alta
 * (autónomo o centro), así que este error solo se da si alguien borró
 * el Professional a mano. La UI debería tratarlo como "no se puede
 * editar el horario hasta que haya al menos un profesional".
 */
export class ProviderHasNoProfessionalError extends Error {
  readonly code = 'NO_PROFESSIONAL';

  constructor(message = 'El proveedor no tiene profesionales asociados.') {
    super(message);
    this.name = 'ProviderHasNoProfessionalError';
  }
}
