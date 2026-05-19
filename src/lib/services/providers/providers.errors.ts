/**
 * Errores tipados del dominio "providers".
 *
 * Lanzar clases específicas (en lugar de `new Error('...')`) permite
 * al caller decidir cómo manejar cada caso sin parsear strings.
 */

export class InvalidSearchFiltersError extends Error {
  readonly code = 'INVALID_SEARCH_FILTERS';

  constructor(
    message = 'Los filtros de búsqueda no son válidos.',
    /**
     * Detalle estructurado del error de Zod, útil para devolver al
     * frontend en formato API si fuera necesario.
     */
    public readonly issues?: unknown,
  ) {
    super(message);
    this.name = 'InvalidSearchFiltersError';
  }
}

export class ProviderNotFoundError extends Error {
  readonly code = 'PROVIDER_NOT_FOUND';

  constructor(message = 'Proveedor no encontrado.') {
    super(message);
    this.name = 'ProviderNotFoundError';
  }
}
