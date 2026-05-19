import type { GeoBounds, GeoPoint, PriceRange, ProviderWithAvailability } from '@/types/domain';

/**
 * Filtros aceptados por `searchProviders`.
 *
 * Todos los campos son opcionales. La estrategia es que la UI los
 * componga progresivamente (texto libre + chip de categoría + toggle
 * "ahora") sin obligar al usuario a rellenar nada.
 *
 * `bounds` se usa cuando el usuario interactúa con el mapa: enviamos
 * el viewport y filtramos al área visible.
 *
 * `userLocation` no es propiamente un filtro sino contexto opcional
 * para calcular distancia. Si está presente, los resultados se ordenan
 * por distancia ascendente.
 */
export interface SearchProvidersFilters {
  query?: string;
  categorySlug?: string;
  availabilityOnly?: boolean;
  minRating?: number;
  priceRange?: PriceRange[];
  bounds?: GeoBounds;
  userLocation?: GeoPoint;
}

/**
 * Resultado de la búsqueda: lista de proveedores con disponibilidad y
 * distancia opcional, ordenada según las reglas del servicio.
 */
export type SearchProvidersResult = ProviderWithAvailability[];
