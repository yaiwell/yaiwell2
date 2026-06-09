import { ZodError } from 'zod';

import { searchRepository } from './search.repository';
import { SearchValidationError } from './search.errors';
import { searchOptionsSchema } from './search.validation';

import type { ProviderSearchResult, SearchOptions, ServiceSearchResult } from './search.types';

/**
 * Servicio de búsqueda full-text sobre servicios y proveedores.
 *
 * El motor combina FTS (`ts_rank_cd` sobre `search_vector`) con
 * trigram (`similarity()`) para tolerancia a typos. Ver
 * `search.repository.ts` para el detalle.
 *
 * La capa de servicio se limita a validar input y delegar al
 * repositorio. No hay reglas de negocio adicionales (no se filtra
 * por categoría/precio aquí — eso vivirá en una capa de filtros
 * encima cuando lleguemos a la UI de Fase 1).
 */

/**
 * Busca servicios que matcheen `query`.
 *
 * @param options input de búsqueda (query, language, limit, offset).
 * @returns lista de servicios ordenados por relevancia descendente.
 * @throws SearchValidationError si el input no pasa la validación Zod.
 */
export async function searchServices(options: SearchOptions): Promise<ServiceSearchResult[]> {
  const parsed = parseOrThrow(options);
  return searchRepository.searchServices(
    parsed.query,
    parsed.language,
    parsed.limit,
    parsed.offset,
  );
}

/**
 * Busca proveedores aprobados que matcheen `query`.
 *
 * Solo incluye proveedores con `verificationStatus = 'approved'` (filtro
 * aplicado en la query) para que la búsqueda pública no devuelva centros
 * pendientes de moderación.
 *
 * @param options input de búsqueda.
 * @returns lista de proveedores ordenados por relevancia descendente.
 * @throws SearchValidationError si el input no pasa la validación Zod.
 */
export async function searchProviders(options: SearchOptions): Promise<ProviderSearchResult[]> {
  const parsed = parseOrThrow(options);
  return searchRepository.searchProviders(
    parsed.query,
    parsed.language,
    parsed.limit,
    parsed.offset,
  );
}

function parseOrThrow(options: SearchOptions) {
  try {
    return searchOptionsSchema.parse(options);
  } catch (err) {
    if (err instanceof ZodError) {
      // Cogemos el primer issue para el mensaje principal — el caller
      // recibe el código tipado y puede inspeccionar `cause` si necesita
      // detalle completo.
      const first = err.issues[0];
      throw new SearchValidationError(first?.message ?? undefined);
    }
    throw err;
  }
}
