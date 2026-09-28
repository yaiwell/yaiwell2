import type { LocalizedText, Provider, Service } from '@/types/domain';

import type { SearchableProvider } from './providers.types';

/**
 * Mapeo de filas crudas (raw SQL y Prisma) a tipos del dominio.
 *
 * Separado del repositorio para que este se limite a las consultas y
 * no supere el límite de ~250 líneas de §6.bis.
 */

/**
 * Forma cruda que devuelve la raw query desde Postgres. Coincide con
 * `PROVIDER_COLUMNS_FRAGMENT` — mantener ambos alineados al ampliar
 * columnas.
 */
export interface ProviderRow {
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
 * Fila del listado de búsqueda: la de siempre más el blob de
 * `SEARCH_TEXT_FRAGMENT`. Puede venir null si Postgres no agrega nada.
 */
export interface SearchableProviderRow extends ProviderRow {
  searchText: string | null;
}

/**
 * Convierte la fila cruda al `Provider` del dominio. Tolera
 * description JSONB con sólo `es`/`ca` o vacía y normaliza `photos`
 * y `categoryIds` a arrays nunca nulos.
 */
export function mapProviderRow(row: ProviderRow): Provider {
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
 * Separa el texto de búsqueda del proveedor público. Construimos el
 * `Provider` con `mapProviderRow` (y no con un spread de la fila) para
 * que `searchText` no se cuele en el objeto que acaba en el cliente.
 */
export function mapSearchableProviderRow(row: SearchableProviderRow): SearchableProvider {
  return { provider: mapProviderRow(row), searchText: row.searchText ?? '' };
}

/**
 * Mapea un `Service` de Prisma al `Service` del dominio.
 *
 * `name` y `description` se persisten como `Json` en BD (la tabla puede
 * llegar a tener traducciones parciales). Tipamos como Partial para
 * tolerar el caso "sólo es/ca", que es lo que rellena el wizard.
 */
export function mapPrismaService(row: {
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
