/**
 * Tipos de dominio compartidos del proyecto Yeiwell.
 *
 * Estos tipos modelan las entidades centrales (categorías, proveedores,
 * servicios, disponibilidad) y son la fuente de verdad consumida por:
 * - capa de servicios `/lib/services/*`
 * - componentes de UI en `/components/*`
 * - futura app móvil (vía paquete compartido)
 *
 * Mantenemos los textos visibles al usuario (`name`, `description`) como
 * objetos `LocalizedText` con las dos lenguas soportadas hoy (es/ca) para
 * que el render dependa solo del locale activo, sin lookups externos.
 */

/**
 * Texto traducido a los locales soportados.
 * Se usa para campos que vienen del dominio (nombre de proveedor,
 * descripción de servicio, etc.) y no del namespace i18n estático.
 */
export interface LocalizedText {
  es: string;
  ca: string;
}

/** Rango de precio cualitativo. Tres niveles para no abrumar la UI. */
export type PriceRange = '€' | '€€' | '€€€';

/** Tipo de proveedor: profesional autónomo o centro con varios profesionales. */
export type ProviderType = 'autonomo' | 'centro';

/**
 * Estado de disponibilidad calculado en el momento de la búsqueda.
 * Determina el color del pin en el mapa y el badge de la card.
 */
export type AvailabilityStatus = 'available_now' | 'available_soon' | 'busy';

/**
 * Categoría jerárquica del catálogo (hasta 3 niveles via `parentId`).
 * El `icon` es el nombre del componente de Lucide React (ej. 'Scissors').
 */
export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  /** `null` para categorías raíz (top-level). */
  parentId: string | null;
  icon: string;
}

/**
 * Slot de disponibilidad propuesto por el motor de availability.
 * `endAt` ya incluye la duración del servicio + buffer del proveedor.
 */
export interface AvailabilitySlot {
  startAt: Date;
  endAt: Date;
}

/**
 * Resumen de disponibilidad enriquecido sobre cada proveedor.
 * Lo construye el service en `searchProviders`, no se persiste.
 */
export interface ProviderAvailability {
  status: AvailabilityStatus;
  /** Próximo hueco si lo hay; `null` si está ocupado. */
  nextSlot: AvailabilitySlot | null;
}

/**
 * Coordenada geográfica simple en grados decimales.
 * En producción este punto vendrá de PostGIS (Point SRID 4326).
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Caja delimitadora del viewport del mapa (norte/sur/este/oeste).
 * Se usa para filtrar proveedores al área visible.
 */
export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Proveedor del marketplace (autónomo o centro).
 * Las coordenadas viven en `location`; el resto son metadatos
 * presentacionales y de search ranking básico.
 */
export interface Provider {
  id: string;
  slug: string;
  name: string;
  type: ProviderType;
  description: LocalizedText;
  address: string;
  location: GeoPoint;
  photos: string[];
  rating: number;
  reviewsCount: number;
  priceRange: PriceRange;
  /** Categorías que el proveedor cubre, por id. */
  categoryIds: string[];
}

/**
 * Proveedor enriquecido tras pasar por `searchProviders`: añade el
 * cálculo de disponibilidad y, si se pasó `userLocation`, la distancia
 * en km al usuario.
 */
export interface ProviderWithAvailability extends Provider {
  availability: ProviderAvailability;
  /** Distancia al usuario en km, redondeada a 1 decimal. `null` si no hay geolocalización. */
  distanceKm: number | null;
}

/**
 * Servicio concreto que un proveedor ofrece.
 * Las URLs públicas serán `/centro/[slug]-[id]/servicio/[serviceId]`.
 */
export interface Service {
  id: string;
  providerId: string;
  professionalId: string | null;
  categoryId: string;
  name: LocalizedText;
  description: LocalizedText;
  durationMinutes: number;
  priceCents: number;
}

/**
 * Reseña de un cliente sobre un proveedor. Los textos NO se traducen
 * en demo (vienen escritos por usuarios reales); los mantenemos en
 * el idioma original aunque la UI esté en otra lengua.
 */
export interface Review {
  id: string;
  providerId: string;
  authorName: string;
  /** Nota entera 1-5 (no medias en demo). */
  rating: number;
  text: string;
  /** Fecha relativa, ej. "hace 2 semanas" — se genera ya formateada para simplificar la demo. */
  createdAt: Date;
}
