import type { SearchWhen } from '@/lib/utils/search-when';
import type {
  GeoBounds,
  GeoPoint,
  PriceRange,
  Provider,
  ProviderWithAvailability,
  PublicProfessional,
  Review,
  Service,
  ServiceWithRootCategory,
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
  /** Solo centros con algún hueco liberado con descuento ahora. */
  discountOnly?: boolean;
  /** Solo centros con algún hueco reservable en ese rango de días. */
  when?: SearchWhen;
  /** Solo centros con hueco en alguno de estos días (`YYYY-MM-DD`). Manda sobre `when`. */
  days?: string[];
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
  /**
   * Catálogo con la categoría raíz ya resuelta: la ficha agrupa por
   * ella y necesita el dato resuelto en servidor (ver
   * `ServiceWithRootCategory`).
   */
  services: ServiceWithRootCategory[];
  reviews: Review[];
  ratingBreakdown: RatingBreakdown;
  /**
   * Equipo público: profesionales activos que prestan algún servicio
   * publicado, por antigüedad. Lo pinta la sección «El equipo».
   */
  team: PublicProfessional[];
}

/**
 * Un servicio del catálogo junto a quién lo presta (tabla
 * `service_professionals`, migración 9h), tal y como lo lee el
 * repositorio.
 */
export interface ProviderServiceWithTeam {
  service: Service;
  /** Profesionales activos que lo prestan, por antigüedad. */
  professionals: PublicProfessional[];
}

/**
 * Datos mínimos para renderizar la ficha pública de un servicio
 * concreto: el servicio, el proveedor al que pertenece y quién lo
 * presta (bloque «Quién lo presta»).
 */
export interface ProviderServiceDetail extends ProviderServiceWithTeam {
  provider: Provider;
}

/**
 * Proveedor tal y como lo necesita el buscador: el `Provider` público
 * más un blob de texto con los nombres de sus servicios activos y de
 * las categorías (con ascendencia) en todos los idiomas.
 *
 * Es un tipo interno del módulo a propósito: `searchText` no debe
 * acabar en `Provider` (dominio compartido con la futura app móvil)
 * ni viajar al cliente en la respuesta de `/buscar`. Por eso va al
 * lado del proveedor y no mezclado con sus campos.
 */
export interface SearchableProvider {
  provider: Provider;
  searchText: string;
}
