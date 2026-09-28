import 'server-only';

import { prisma } from '@/lib/db/prisma';
import type { SitemapProviderRef } from '@/lib/seo';
import type { Provider, Service, ServiceWithRootCategory } from '@/types/domain';

import { resolveRootCategory } from './providers.categories';
import {
  mapPrismaService,
  mapProviderRow,
  mapSearchableProviderRow,
  type ProviderRow,
  type SearchableProviderRow,
} from './providers.mapper';
import { PROVIDER_COLUMNS_FRAGMENT, SEARCH_TEXT_FRAGMENT } from './providers.sql';
import type { SearchableProvider } from './providers.types';

/**
 * Repositorio de proveedores: única frontera entre la lógica de
 * negocio y Prisma para el dominio público de providers.
 *
 * Solo expone proveedores **aprobados y no borrados**: el filtro
 * `verificationStatus = 'approved' AND deletedAt IS NULL` es defensivo
 * y se aplica aquí — el service no necesita repetirlo. Los providers
 * pendientes de verificación viven en el panel admin (cola), no en
 * el listado público.
 *
 * Las columnas y los subqueries (categorías derivadas, texto de
 * búsqueda) viven en `providers.sql.ts`; el mapeo de filas, en
 * `providers.mapper.ts`.
 */
export const providersRepository = {
  /**
   * Devuelve todos los proveedores aprobados y vivos, ordenados por
   * rating descendente, junto a su texto de búsqueda (servicios y
   * categorías). La ordenación final por distancia/rating la decide
   * el service (`searchProviders`).
   *
   * El texto de búsqueda solo se calcula aquí: la ficha
   * (`findById`/`findBySlug`) no lo necesita y no pagamos el subquery.
   */
  async findAllForSearch(): Promise<SearchableProvider[]> {
    const rows = await prisma.$queryRaw<SearchableProviderRow[]>`
      SELECT
        ${PROVIDER_COLUMNS_FRAGMENT},
        ${SEARCH_TEXT_FRAGMENT} AS "searchText"
      FROM providers p
      WHERE p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
      ORDER BY p."ratingAvg" DESC, p."ratingCount" DESC
    `;
    return rows.map(mapSearchableProviderRow);
  },

  /**
   * Localiza un proveedor por id. Mantiene el filtro de aprobación
   * para no exponer providers pending vía URL directa.
   */
  async findById(id: string): Promise<Provider | null> {
    const rows = await prisma.$queryRaw<ProviderRow[]>`
      SELECT ${PROVIDER_COLUMNS_FRAGMENT}
      FROM providers p
      WHERE p.id = ${id}
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
      LIMIT 1
    `;
    return rows[0] ? mapProviderRow(rows[0]) : null;
  },

  /**
   * Localiza un proveedor por slug. Mantiene el filtro de aprobación
   * (un slug de un provider pending devuelve null → 404 público).
   */
  async findBySlug(slug: string): Promise<Provider | null> {
    const rows = await prisma.$queryRaw<ProviderRow[]>`
      SELECT ${PROVIDER_COLUMNS_FRAGMENT}
      FROM providers p
      WHERE p.slug = ${slug}
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
      LIMIT 1
    `;
    return rows[0] ? mapProviderRow(rows[0]) : null;
  },

  /**
   * Localiza un servicio dentro del catálogo de un proveedor concreto.
   *
   * Devuelve `null` si:
   *  - El servicio no existe.
   *  - El servicio pertenece a otro `providerId` (URL manipulada).
   *  - El servicio está soft-deleted o pausado (`isActive=false`).
   */
  async findServiceByProvider(providerId: string, serviceId: string): Promise<Service | null> {
    const row = await prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        providerId: true,
        professionalId: true,
        categoryId: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
      },
    });
    return row ? mapPrismaService(row) : null;
  },

  /**
   * Devuelve el catálogo de servicios activos de un proveedor, con la
   * categoría raíz de cada uno ya resuelta.
   *
   * Aplica los mismos filtros que `findServiceByProvider` para que la
   * ficha pública del centro y los lookups individuales sean coherentes.
   *
   * La cadena de ancestros de la categoría viaja en el **mismo** SELECT
   * (join anidado hasta los 3 niveles que admite la jerarquía). Así la
   * ficha agrupa por categoría raíz sin una consulta por servicio y sin
   * cargar el catálogo de categorías en el bundle del cliente.
   */
  async findServicesByProvider(providerId: string): Promise<ServiceWithRootCategory[]> {
    const rows = await prisma.service.findMany({
      where: {
        providerId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        providerId: true,
        professionalId: true,
        categoryId: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                slug: true,
                name: true,
                parentId: true,
                parent: { select: { id: true, slug: true, name: true, parentId: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      ...mapPrismaService(row),
      rootCategory: resolveRootCategory(row.category),
    }));
  },

  /**
   * Devuelve el precio mínimo (céntimos) de los servicios activos de
   * un proveedor, o `null` si todavía no tiene catálogo publicado.
   *
   * Usado por las cards de búsqueda para mostrar el "desde X €". Una
   * sola agregación en BD evita traer el catálogo entero a Node.
   */
  async findMinPriceCents(providerId: string): Promise<number | null> {
    const row = await prisma.service.aggregate({
      where: { providerId, deletedAt: null, isActive: true },
      _min: { priceCents: true },
    });
    return row._min.priceCents ?? null;
  },

  /**
   * Versión BATCH de `findMinPriceCents` para el listado.
   *
   * El listado pintaba el precio "desde" llamando a `findMinPriceCents`
   * una vez por proveedor: con 500 proveedores eran 500 consultas por
   * request. Un único `groupBy` devuelve lo mismo.
   *
   * Los proveedores sin catálogo activo no aparecen en el resultado del
   * `groupBy`; el caller debe tratar su ausencia como `null`.
   */
  async findMinPriceCentsBatch(
    providerIds: readonly string[],
  ): Promise<Map<string, number | null>> {
    if (providerIds.length === 0) return new Map();

    const rows = await prisma.service.groupBy({
      by: ['providerId'],
      where: {
        providerId: { in: providerIds as string[] },
        deletedAt: null,
        isActive: true,
      },
      _min: { priceCents: true },
    });

    return new Map(rows.map((row) => [row.providerId, row._min.priceCents ?? null]));
  },

  /**
   * Proyección mínima de los proveedores públicos para el sitemap.
   *
   * Deliberadamente NO reutiliza `findAllForSearch()`: aquella trae descripción,
   * fotos, categorías agregadas y extrae lng/lat con PostGIS, y el
   * sitemap solo necesita construir la URL y el `lastmod`. Aquí van
   * tres columnas, sin joins ni geometría, sobre el mismo filtro
   * indexado (`verificationStatus`, `deletedAt`).
   *
   * @param limit — tope de filas. El protocolo Sitemaps admite 50.000
   *   URLs por fichero y nosotros emitimos una por locale, así que el
   *   caller debe pasar `50000 / nº de locales` como mucho. Si algún
   *   día lo superamos, toca partir el sitemap con `generateSitemaps`.
   */
  async findAllForSitemap(limit: number): Promise<SitemapProviderRef[]> {
    return prisma.provider.findMany({
      where: { verificationStatus: 'approved', deletedAt: null },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  },
};
