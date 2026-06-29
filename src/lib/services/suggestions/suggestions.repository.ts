import { prisma } from '@/lib/db/prisma';

import { normalizeForMatch } from './suggestions.utils';

import type { SuggestionLocale } from '@/lib/fake-data/search-suggestions';
import type { LocalizedText } from '@/types/domain';

/**
 * Repositorio del autocomplete: encapsula los lookups específicos del
 * módulo `suggestions`.
 *
 * El motor principal de búsqueda (FTS + trigram) vive en
 * `@/lib/services/search`. Aquí solo tenemos las dos consultas que el
 * autocomplete necesita y que la API de `search` no expone:
 *  - matching tolerante a acentos/mayúsculas sobre el catálogo de
 *    categorías (no indexado en `tsvector`),
 *  - lookup batched de proveedores por id, usado para enriquecer cada
 *    sugerencia de servicio con el `businessName` y `slug` del centro
 *    (necesarios para componer `/centro/[slug]-[id]` y el sublabel).
 */
export const suggestionsRepository = {
  /**
   * Devuelve hasta `limit` categorías cuyo nombre en el `locale` activo
   * (con fallback a `es`) contenga `query` ignorando mayúsculas y
   * diacríticos.
   *
   * El catálogo es pequeño (~60 entradas) y estable, así que cargar todo
   * y filtrar en memoria es más simple y rápido que parsear el JSONB
   * con `unaccent + ilike` en SQL. Cuando el catálogo crezca o llegue
   * la i18n masiva, migraremos a un índice GIN sobre `name->>locale`.
   */
  async findCategoriesMatching(
    query: string,
    locale: SuggestionLocale,
    limit: number,
  ): Promise<Array<{ id: string; slug: string; name: LocalizedText }>> {
    if (limit <= 0) return [];

    const all = await prisma.category.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { slug: 'asc' },
    });

    const normalizedQuery = normalizeForMatch(query);
    if (normalizedQuery.length === 0) return [];

    const matched: Array<{ id: string; slug: string; name: LocalizedText }> = [];
    for (const cat of all) {
      // `name` viene como `Prisma.JsonValue`; el shape real es `LocalizedText`
      // (es/ca obligatorios, en/de opcionales). El cast cruzado es el patrón
      // ya usado en `categories.service.ts` y otros consumidores del JSONB.
      const localized = cat.name as unknown as LocalizedText;
      const text = localized[locale] ?? localized.es;
      if (typeof text !== 'string' || text.length === 0) continue;
      if (normalizeForMatch(text).includes(normalizedQuery)) {
        matched.push({ id: cat.id, slug: cat.slug, name: localized });
        if (matched.length >= limit) break;
      }
    }
    return matched;
  },

  /**
   * Lookup batched de proveedores por id; devuelve un `Map` para que el
   * caller pueda enriquecer N servicios con O(1) por servicio sin
   * generar N+1 queries.
   *
   * Filtramos `deletedAt IS NULL`: si un proveedor está borrado lógico,
   * la sugerencia que apunte a él se descarta arriba en el servicio en
   * lugar de mostrar un enlace que rompería al navegar.
   */
  async findProvidersByIds(
    ids: readonly string[],
  ): Promise<Map<string, { slug: string; businessName: string }>> {
    if (ids.length === 0) return new Map();

    const rows = await prisma.provider.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true, slug: true, businessName: true },
    });

    return new Map(rows.map((r) => [r.id, { slug: r.slug, businessName: r.businessName }]));
  },
};
