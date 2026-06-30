import 'server-only';

import { prisma } from '@/lib/db/prisma';
import type { GeoPoint, Provider, ProviderWithAvailability, Review } from '@/types/domain';

import { InvalidSearchFiltersError } from './providers.errors';
import { providersRepository } from './providers.repository';
import {
  searchProvidersFiltersSchema,
  type SearchProvidersFiltersParsed,
} from './providers.validation';
import type {
  ProviderDetail,
  ProviderServiceDetail,
  SearchProvidersFilters,
  SearchProvidersResult,
} from './providers.types';

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
 * Enriquece un proveedor con disponibilidad y distancia opcional.
 *
 * `availability` queda hoy como placeholder optimista (`available_now`,
 * `nextSlot=null`) para providers reales: el motor de slots
 * (`lib/services/availability`) opera por `professionalId` y todavía no
 * está cableado al listado público — exigirlo aquí significaría una
 * cascada de queries (N profesionales × M servicios × cálculo) que el
 * `/buscar` no aguantaría sin paginar primero. Cuando llegue el
 * motor conectado al panel, este valor pasará a calcularse de verdad.
 */
function enrichProvider(
  provider: Provider,
  userLocation: GeoPoint | undefined,
): ProviderWithAvailability {
  return {
    ...provider,
    availability: {
      status: 'available_now',
      nextSlot: null,
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
 * basarse en la disponibilidad calculada. Hoy todos los providers se
 * marcan disponibles, así que el toggle es no-op temporal.
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

  // 2. Enrichment con disponibilidad y distancia.
  const enriched = filtered.map((p) => enrichProvider(p, parsed.data.userLocation));

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
 * si todavía no tiene catálogo publicado. Atajo expuesto desde el
 * service porque las cards de UI lo consumen al render.
 */
export async function getFromPriceCents(providerId: string): Promise<number | null> {
  return providersRepository.findMinPriceCents(providerId);
}

/**
 * Devuelve toda la información necesaria para renderizar la ficha pública
 * de un proveedor: datos básicos, servicios ordenados, reseñas recientes
 * y el desglose de valoraciones.
 *
 * Devuelve `null` si el proveedor no existe o ha sido eliminado. No lanza
 * errores para que las páginas puedan responder con un 404 limpio sin
 * envolver la llamada en try/catch.
 */
export async function getProviderDetail(providerId: string): Promise<ProviderDetail | null> {
  const provider = await providersRepository.findById(providerId);
  if (!provider) return null;

  // Paralelizamos las 3 lecturas que dependen sólo de providerId.
  const [services, reviews] = await Promise.all([
    providersRepository.findServicesByProvider(providerId),
    findReviewsByProvider(providerId),
  ]);

  return {
    provider,
    services,
    reviews,
    ratingBreakdown: computeRatingBreakdown(reviews),
  };
}

/**
 * Devuelve un servicio concreto dentro del catálogo de un proveedor,
 * acompañado del propio proveedor para que la página de detalle pueda
 * renderizar breadcrumbs y cabecera sin un segundo lookup.
 *
 * Devuelve `null` si el proveedor o el servicio no existen, o si el
 * servicio pertenece a otro proveedor (caso de URL manipulada). La
 * página llamadora se encarga de responder con un 404 limpio.
 */
export async function getProviderService(
  providerId: string,
  serviceId: string,
): Promise<ProviderServiceDetail | null> {
  const provider = await providersRepository.findById(providerId);
  if (!provider) return null;

  const service = await providersRepository.findServiceByProvider(providerId, serviceId);
  if (!service) return null;

  return { provider, service };
}

// ============================================================================
// Helpers privados: reviews y rating breakdown
// ============================================================================

/**
 * Lectura mínima de reviews de un provider para la ficha pública.
 *
 * Vive en este archivo (no en repository) porque el shape `Review` del
 * dominio simplifica `createdAt` a "fecha relativa formateada" para la
 * demo: aquí se mantiene como `Date` y el componente formatea con
 * `next-intl`. Cuando crezcamos a paginación/filtros, mover al repo.
 */
async function findReviewsByProvider(providerId: string): Promise<Review[]> {
  const rows = await prisma.review.findMany({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      rating: true,
      text: true,
      createdAt: true,
      author: { select: { fullName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    providerId,
    authorName: formatAuthorName(r.author?.fullName),
    rating: r.rating,
    text: r.text,
    createdAt: r.createdAt,
  }));
}

/**
 * Compone "Nombre A." cuando hay apellido y "Anónimo" si el author
 * está vacío. Evitamos exponer apellidos completos en la UI pública.
 *
 * `User.fullName` es nullable y libre — la mayoría llegan como
 * "Nombre Apellido". Si no hay nada usable devolvemos "Anónimo".
 */
function formatAuthorName(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? '').trim();
  if (!trimmed) return 'Anónimo';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const [first, ...rest] = parts;
  const lastInitial = rest[rest.length - 1].charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * Distribución de reviews por nota 1-5. Calculada en Node sobre el
 * conjunto ya cargado para evitar otra query — el slice de 20 es
 * suficiente para la ficha pública.
 */
function computeRatingBreakdown(reviews: Review[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of reviews) {
    const key = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[key] += 1;
  }
  return breakdown;
}
