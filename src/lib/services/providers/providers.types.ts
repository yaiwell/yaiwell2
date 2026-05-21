import type {
  GeoBounds,
  GeoPoint,
  PriceRange,
  Provider,
  ProviderWithAvailability,
  Review,
  Service,
} from '@/types/domain';

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

/**
 * Recuento de reseñas por cada estrella (1 a 5).
 * Lo usa la ficha pública para pintar las barras de distribución.
 */
export interface RatingBreakdown {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/**
 * Datos agregados necesarios para renderizar la ficha pública de un
 * proveedor en una sola lectura: información básica, sus servicios,
 * reseñas y el desglose de valoraciones.
 */
export interface ProviderDetail {
  provider: Provider;
  services: Service[];
  reviews: Review[];
  ratingBreakdown: RatingBreakdown;
}
