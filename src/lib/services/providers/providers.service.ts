import { getCategoryBySlug } from '@/lib/fake-data/categories';
import { getAvailabilityStatus, getNextSlot } from '@/lib/fake-data/availability';
import { getProviderFromPriceCents } from '@/lib/fake-data/services';
import type { GeoPoint, Provider, ProviderWithAvailability } from '@/types/domain';

import { InvalidSearchFiltersError } from './providers.errors';
import { providersRepository } from './providers.repository';
import {
  searchProvidersFiltersSchema,
  type SearchProvidersFiltersParsed,
} from './providers.validation';
import type { SearchProvidersFilters, SearchProvidersResult } from './providers.types';

/**
 * Calcula la distancia en km entre dos puntos usando la fórmula de
 * Haversine. Suficientemente precisa para distancias urbanas (<50 km)
 * y barata de calcular en JS.
 *
 * En producción, esto vivirá en PostGIS (`ST_Distance`) directamente
 * en la query SQL — no se transferirán todos los proveedores a Node.
 */
function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // radio medio terrestre en km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Aplica todos los filtros sobre un Provider crudo y devuelve `true`
 * si pasa el corte. Mantener la función pequeña hace que añadir filtros
 * nuevos (por ejemplo "tipo: solo centros") sea de una sola línea.
 */
function matchesFilters(provider: Provider, filters: SearchProvidersFiltersParsed): boolean {
  // Filtro por categoría (cualquier categoría asociada, incluida raíz).
  if (filters.categorySlug) {
    const category = getCategoryBySlug(filters.categorySlug);
    if (!category) return false;
    if (!provider.categoryIds.includes(category.id)) return false;
  }

  // Filtro por texto libre: matching simple, case-insensitive, sobre
  // nombre, dirección y descripción es/ca. Es el placeholder hasta
  // que tengamos `tsvector` en PostgreSQL.
  if (filters.query && filters.query.length > 0) {
    const haystack = [
      provider.name,
      provider.address,
      provider.description.es,
      provider.description.ca,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(filters.query.toLowerCase())) return false;
  }

  if (filters.minRating !== undefined && provider.rating < filters.minRating) {
    return false;
  }

  if (filters.priceRange && filters.priceRange.length > 0) {
    if (!filters.priceRange.includes(provider.priceRange)) return false;
  }

  if (filters.bounds) {
    const { north, south, east, west } = filters.bounds;
    const { lat, lng } = provider.location;
    if (lat > north || lat < south || lng > east || lng < west) return false;
  }

  return true;
}

/**
 * Enriquece un proveedor con su disponibilidad calculada y la distancia
 * opcional al usuario. Mantenemos esto en una función dedicada para que
 * `searchProviders` solo orqueste y sea más legible.
 */
function enrichProvider(
  provider: Provider,
  userLocation: GeoPoint | undefined,
  now: Date,
): ProviderWithAvailability {
  return {
    ...provider,
    availability: {
      status: getAvailabilityStatus(provider.id),
      nextSlot: getNextSlot(provider.id, now),
    },
    distanceKm: userLocation
      ? Math.round(haversineKm(userLocation, provider.location) * 10) / 10
      : null,
  };
}

/**
 * Busca proveedores aplicando los filtros indicados.
 *
 * Orden de los resultados:
 *  1. Si hay `userLocation`: por distancia ascendente.
 *  2. Si no: por rating descendente y, en empate, por número de reseñas.
 *
 * El filtro `availabilityOnly` se aplica DESPUÉS del enrichment para
 * basarse en la disponibilidad real calculada.
 *
 * @throws InvalidSearchFiltersError si Zod rechaza la entrada.
 */
export async function searchProviders(
  filters: SearchProvidersFilters = {},
): Promise<SearchProvidersResult> {
  // Validamos y normalizamos filtros antes de tocar el repositorio.
  // Devolvemos un error tipado para que el caller decida cómo responder.
  const parsed = searchProvidersFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    throw new InvalidSearchFiltersError(
      'Los filtros de búsqueda no son válidos.',
      parsed.error.issues,
    );
  }

  const now = new Date();
  const all = await providersRepository.findAll();

  // 1. Filtro previo basado en propiedades del proveedor.
  const filtered = all.filter((p) => matchesFilters(p, parsed.data));

  // 2. Enrichment con disponibilidad y distancia.
  const enriched = filtered.map((p) => enrichProvider(p, parsed.data.userLocation, now));

  // 3. Filtro post-enrichment: "solo disponibles ahora".
  const final = parsed.data.availabilityOnly
    ? enriched.filter((p) => p.availability.status === 'available_now')
    : enriched;

  // 4. Ordenación final.
  return final.sort((a, b) => {
    if (parsed.data.userLocation && a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.reviewsCount - a.reviewsCount;
  });
}

/**
 * Devuelve el precio "desde" (céntimos) del proveedor dado, o `null`
 * si no tiene servicios. Es un atajo expuesto desde el service porque
 * lo consumen las cards de UI directamente al render.
 */
export function getFromPriceCents(providerId: string): number | null {
  return getProviderFromPriceCents(providerId);
}
