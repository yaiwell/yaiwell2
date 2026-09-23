import 'server-only';

import { prisma } from '@/lib/db/prisma';
import type { Review } from '@/types/domain';

import { toRatingBreakdown } from './providers.rating';
import { providersRepository } from './providers.repository';
import type { ProviderDetail, ProviderServiceDetail, RatingBreakdown } from './providers.types';

/**
 * Devuelve el precio "desde" (céntimos) del proveedor dado, o `null`
 * si todavía no tiene catálogo publicado. Atajo expuesto desde el
 * service porque las cards de UI lo consumen al render.
 */
export async function getFromPriceCents(providerId: string): Promise<number | null> {
  return providersRepository.findMinPriceCents(providerId);
}

/**
 * Precio "desde" de varios proveedores en una sola consulta.
 *
 * Lo usa el listado público: llamar a `getFromPriceCents` dentro de un
 * `map` provocaba una consulta por proveedor.
 *
 * @returns mapa `providerId → céntimos`, con `null` para los que aún no
 *   tienen catálogo activo publicado.
 */
export async function getFromPriceCentsBatch(
  providerIds: readonly string[],
): Promise<Map<string, number | null>> {
  return providersRepository.findMinPriceCentsBatch(providerIds);
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

  // Paralelizamos las lecturas que dependen sólo de providerId.
  // El desglose de notas va aparte (agregación en BD) en vez de
  // derivarse de `reviews`: esa lista es una muestra de las 20 últimas
  // y las barras se pintan sobre el total real de valoraciones.
  const [services, reviews, ratingBreakdown] = await Promise.all([
    providersRepository.findServicesByProvider(providerId),
    findReviewsByProvider(providerId),
    countReviewsByRating(providerId),
  ]);

  return {
    provider,
    services,
    reviews,
    ratingBreakdown,
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
 * Distribución de reviews por nota 1-5 sobre **todas** las reseñas del
 * proveedor.
 *
 * Antes se calculaba en Node sobre las 20 reseñas que trae
 * `findReviewsByProvider`, pero la UI divide cada barra entre el total
 * real (`provider.reviewsCount`): un centro con 40 reseñas de 5★
 * pintaba la barra al 50%. La agregación cuesta una única consulta
 * extra —un `groupBy` sobre el índice `reviews(rating)`— y se lanza en
 * paralelo con el resto de lecturas de la ficha, así que no añade
 * latencia observable.
 *
 * Vive aquí, junto a `findReviewsByProvider`, por el mismo criterio:
 * las lecturas de reseñas de la ficha pública todavía no justifican su
 * propio repositorio.
 */
async function countReviewsByRating(providerId: string): Promise<RatingBreakdown> {
  const rows = await prisma.review.groupBy({
    by: ['rating'],
    where: { providerId },
    _count: { _all: true },
  });
  return toRatingBreakdown(rows.map((row) => ({ rating: row.rating, count: row._count._all })));
}
