/**
 * Errores tipados del dominio de búsqueda.
 *
 * Permiten al caller decidir entre devolver 400 vs reintentar vs
 * silenciar, sin tener que parsear mensajes.
 */

export class SearchValidationError extends Error {
  readonly code = 'SEARCH_VALIDATION_FAILED';
  constructor(message = 'La consulta de búsqueda no es válida.') {
    super(message);
    this.name = 'SearchValidationError';
  }
}
