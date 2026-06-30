import 'server-only';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import type { LocalizedText, Provider, Service } from '@/types/domain';

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
 * `location` es PostGIS `geography(Point, 4326)` (Prisma la trata como
 * `Unsupported`), por lo que usamos raw SQL con `ST_X`/`ST_Y` para
 * extraer lng/lat al shape `GeoPoint` del dominio. Los categoryIds se
 * agregan en la misma query con `array_agg` sobre la tabla puente
 * `provider_categories` para evitar N+1.
 */

// ============================================================================
// Tipos internos de mapeo
// ============================================================================

/**
 * Forma cruda que devuelve la raw query desde Postgres. Coincide con el
 * SELECT compartido entre `findAll`/`findById`/`findBySlug`.
 */
interface ProviderRow {
  id: string;
  slug: string;
  businessName: string;
  type: 'autonomo' | 'centro';
  description: unknown;
  address: string;
  lng: number;
  lat: number;
  photos: string[] | null;
  ratingAvg: number;
  ratingCount: number;
  priceRange: '€' | '€€' | '€€€';
  categoryIds: string[] | null;
}

/**
 * Lista de columnas + agregación de categoryIds usadas por las tres
 * funciones de lectura. Se compone con `Prisma.sql` para que sea
 * interpolable en `prisma.$queryRaw` (los fragmentos van con `sql`,
 * no como argumentos parametrizados).
 */
const providerSelect = Prisma.sql`
  p.id,
  p.slug,
  p."businessName",
  p.type::text AS type,
  p.description,
  p.address,
  ST_X(p.location::geometry)::float8 AS lng,
  ST_Y(p.location::geometry)::float8 AS lat,
  p.photos,
  p."ratingAvg",
  p."ratingCount",
  p."priceRange"::text AS "priceRange",
  COALESCE(
    array_agg(pc."categoryId") FILTER (WHERE pc."categoryId" IS NOT NULL),
    ARRAY[]::text[]
  ) AS "categoryIds"
`;

/**
 * Convierte la fila cruda al `Provider` del dominio. Mantiene la
 * tolerancia ante description JSONB con sólo `es`/`ca` o vacío y
 * normaliza `photos` y `categoryIds` a arrays nunca nulos.
 */
function mapProviderRow(row: ProviderRow): Provider {
  const desc = (row.description ?? {}) as Partial<LocalizedText>;
  return {
    id: row.id,
    slug: row.slug,
    name: row.businessName,
    type: row.type,
    description: {
      es: desc.es ?? '',
      ca: desc.ca ?? '',
      en: desc.en,
      de: desc.de,
    },
    address: row.address,
    location: { lat: row.lat, lng: row.lng },
    photos: row.photos ?? [],
    rating: row.ratingAvg,
    reviewsCount: row.ratingCount,
    priceRange: row.priceRange,
    categoryIds: row.categoryIds ?? [],
  };
}

/**
 * Mapea un `Service` de Prisma al `Service` del dominio.
 *
 * `name` y `description` se persisten como `Json` en BD (la tabla puede
 * llegar a tener traducciones parciales). Tipamos como Partial para
 * tolerar el caso "sólo es/ca", que es lo que rellena el wizard.
 */
function mapPrismaService(row: {
  id: string;
  providerId: string;
  professionalId: string | null;
  categoryId: string;
  name: unknown;
  description: unknown;
  durationMinutes: number;
  priceCents: number;
}): Service {
  const name = (row.name ?? {}) as Partial<LocalizedText>;
  const description = (row.description ?? {}) as Partial<LocalizedText>;
  return {
    id: row.id,
    providerId: row.providerId,
    professionalId: row.professionalId,
    categoryId: row.categoryId,
    name: { es: name.es ?? '', ca: name.ca ?? '', en: name.en, de: name.de },
    description: {
      es: description.es ?? '',
      ca: description.ca ?? '',
      en: description.en,
      de: description.de,
    },
    durationMinutes: row.durationMinutes,
    priceCents: row.priceCents,
  };
}

// ============================================================================
// Repositorio
// ============================================================================

export const providersRepository = {
  /**
   * Devuelve todos los proveedores aprobados y vivos, ordenados por
   * rating descendente. La ordenación final por distancia/rating la
   * decide el service (`searchProviders`).
   */
  async findAll(): Promise<Provider[]> {
    const rows = await prisma.$queryRaw<ProviderRow[]>`
      SELECT ${providerSelect}
      FROM providers p
      LEFT JOIN provider_categories pc ON pc."providerId" = p.id
      WHERE p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
      GROUP BY p.id
      ORDER BY p."ratingAvg" DESC, p."ratingCount" DESC
    `;
    return rows.map(mapProviderRow);
  },

  /**
   * Localiza un proveedor por id. Mantiene el filtro de aprobación
   * para no exponer providers pending vía URL directa.
   */
  async findById(id: string): Promise<Provider | null> {
    const rows = await prisma.$queryRaw<ProviderRow[]>`
      SELECT ${providerSelect}
      FROM providers p
      LEFT JOIN provider_categories pc ON pc."providerId" = p.id
      WHERE p.id = ${id}
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
      GROUP BY p.id
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
      SELECT ${providerSelect}
      FROM providers p
      LEFT JOIN provider_categories pc ON pc."providerId" = p.id
      WHERE p.slug = ${slug}
        AND p."verificationStatus" = 'approved'
        AND p."deletedAt" IS NULL
      GROUP BY p.id
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
   *
   * El filtro `isActive` evita exponer servicios que el dueño pausó
   * desde `/panel/servicios`, coherente con el chequeo en
   * `booking.service.createBooking` y `search.repository.searchServices`.
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
   * Devuelve el catálogo de servicios activos de un proveedor.
   *
   * Aplica los mismos filtros que `findServiceByProvider` para que la
   * ficha pública del centro y los lookups individuales sean coherentes.
   */
  async findServicesByProvider(providerId: string): Promise<Service[]> {
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
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapPrismaService);
  },

  /**
   * Devuelve el precio mínimo (céntimos) de los servicios activos de
   * un proveedor, o `null` si todavía no tiene catálogo publicado.
   *
   * Usado por las cards de búsqueda para mostrar el "desde X €". Una
   * sola query agregada en BD evita traer el catálogo entero a Node.
   */
  async findMinPriceCents(providerId: string): Promise<number | null> {
    const row = await prisma.service.aggregate({
      where: { providerId, deletedAt: null, isActive: true },
      _min: { priceCents: true },
    });
    return row._min.priceCents ?? null;
  },
};
