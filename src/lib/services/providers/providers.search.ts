import 'server-only';

import { prisma } from '@/lib/db/prisma';
import {
  getProvidersAvailability,
  type ProviderAvailabilityMap,
} from '@/lib/services/availability';
import type { GeoPoint, Provider, ProviderWithAvailability } from '@/types/domain';

import { InvalidSearchFiltersError } from './providers.errors';
import { providersRepository } from './providers.repository';
import {
  searchProvidersFiltersSchema,
  type SearchProvidersFiltersParsed,
} from './providers.validation';
import type { SearchProvidersFilters, SearchProvidersResult } from './providers.types';

/**
 * Búsqueda de proveedores para el listado público `/buscar`.
 *
 * Vive separado de `providers.service` porque este último superaba el
 * límite de ~250 líneas de §6.bis al añadirle el cableado de
 * disponibilidad real.
 */

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
 * Aplica los filtros sobre un Provider crudo y devuelve `true` si pasa
 * el corte. El filtro por categoría usa el `categoryId` ya resuelto
 * (ver `searchProviders`) para evitar lookups por iteración.
 */
function matchesFilters(
  provider: Provider,
  filters: SearchProvidersFiltersParsed,
  resolvedCategoryId: string | null,
): boolean {
  // Filtro por categoría: si el caller pidió un slug pero no existe en
  // BD, `resolvedCategoryId` viene null y descartamos todo.
  if (filters.categorySlug) {
    if (!resolvedCategoryId) return false;
    if (!provider.categoryIds.includes(resolvedCategoryId)) return false;
  }

  // Filtro por texto libre: matching simple, case-insensitive, sobre
  // nombre, dirección y descripción es/ca. Es el placeholder hasta
  // que conectemos `searchRepository.searchProviders` (FTS) cuando
  // crezca el catálogo y este `filter()` en Node deje de escalar.
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
 * Enriquece los proveedores con su disponibilidad real y la distancia
 * al usuario.
 *
 * La disponibilidad llega ya calculada en batch: un proveedor ausente
 * del mapa (caso imposible salvo bug) degrada a `busy` en vez de
 * mentir con un `available_now` optimista.
 */
function enrichProviders(
  providers: readonly Provider[],
  availabilityByProvider: ProviderAvailabilityMap,
  userLocation: GeoPoint | undefined,
): ProviderWithAvailability[] {
  return providers.map((provider) => ({
    ...provider,
    availability: availabilityByProvider.get(provider.id) ?? {
      status: 'busy' as const,
      nextSlot: null,
    },
    distanceKm: userLocation
      ? Math.round(haversineKm(userLocation, provider.location) * 10) / 10
      : null,
  }));
}

/**
 * Busca proveedores aplicando los filtros indicados.
 *
 * Orden de los resultados:
 *  1. Si hay `userLocation`: por distancia ascendente.
 *  2. Si no: por rating descendente y, en empate, por número de reseñas.
 *
 * La disponibilidad se calcula DESPUÉS del filtrado para no pagar el
 * cálculo de proveedores que se van a descartar igualmente.
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

  // Resolución previa de la categoría (un solo lookup en BD vs uno por
  // provider). Si el slug no existe en BD, dejamos `null` y el filtro
  // descartará todo — UX correcta para un slug equivocado/anticuado.
  const resolvedCategoryId = parsed.data.categorySlug
    ? ((
        await prisma.category.findUnique({
          where: { slug: parsed.data.categorySlug },
          select: { id: true },
        })
      )?.id ?? null)
    : null;

  const all = await providersRepository.findAll();

  // 1. Filtro previo basado en propiedades del proveedor.
  const filtered = all.filter((p) => matchesFilters(p, parsed.data, resolvedCategoryId));

  // 2. Disponibilidad real, en 2 consultas para todo el conjunto.
  const availabilityByProvider = await getProvidersAvailability(filtered.map((p) => p.id));

  // 3. Enrichment con disponibilidad y distancia.
  const enriched = enrichProviders(filtered, availabilityByProvider, parsed.data.userLocation);

  // 4. Filtro post-enrichment: el toggle "Disponible ahora" deja pasar
  //    también los ámbar. Con la ventana estricta de 15 min del verde,
  //    filtrar solo por `available_now` vaciaría la lista; "ahora o en
  //    la próxima hora" es literalmente la promesa del producto.
  const final = parsed.data.availabilityOnly
    ? enriched.filter(
        (p) =>
          p.availability.status === 'available_now' || p.availability.status === 'available_soon',
      )
    : enriched;

  // 5. Ordenación final. La disponibilidad NO reordena a propósito:
  //    subir los verdes rompería la expectativa de "el más cercano
  //    primero" que crea el propio mapa.
  return final.sort((a, b) => {
    if (parsed.data.userLocation && a.distanceKm !== null && b.distanceKm !== null) {
      return a.distanceKm - b.distanceKm;
    }
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.reviewsCount - a.reviewsCount;
  });
}
