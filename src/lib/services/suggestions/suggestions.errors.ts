/**
 * Errores tipados del dominio de sugerencias del autocomplete.
 *
 * Permiten al caller (API route, hook React, app móvil futura) decidir
 * entre devolver 400, mostrar toast, o silenciar, sin parsear mensajes.
 *
 * Imitan el patrón de `search.errors.ts` para mantener consistencia
 * cross-dominio en el repo.
 */

export class SuggestionsValidationError extends Error {
  readonly code = 'SUGGESTIONS_VALIDATION_FAILED';
  constructor(message = 'La consulta del autocomplete no es válida.') {
    super(message);
    this.name = 'SuggestionsValidationError';
  }
}

/**
 * Error lanzado por el cliente HTTP cuando `/api/suggestions` devuelve
 * un status no 2xx o la respuesta no se puede parsear.
 *
 * Expone `status` y `code` para que la UI distinga 4xx (input feo,
 * normalmente silenciar dropdown) de 5xx (backend caído, posible toast).
 */
export class SuggestionsRequestError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, status: number, code = 'SUGGESTIONS_REQUEST_FAILED') {
    super(message);
    this.name = 'SuggestionsRequestError';
    this.status = status;
    this.code = code;
  }
}
