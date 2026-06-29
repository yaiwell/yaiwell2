import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import type { ProviderSearchResult, SearchLanguage, ServiceSearchResult } from './search.types';

/**
 * Repositorio de búsqueda: encapsula las raw queries contra los
 * `tsvector` materializados en `services` y `providers`.
 *
 * Estrategia de ranking:
 *  - **FTS (70%)**: `ts_rank_cd(search_vector, websearch_to_tsquery(...))`.
 *    Aplica los pesos A/B/C definidos en la migración (nombre > descripción
 *    > categoría/address).
 *  - **Trigram (30%)**: `similarity(name_lang, query)` sobre el campo
 *    principal en el idioma de búsqueda. Aporta tolerancia a typos
 *    (la query "peluquria" matchea "peluquería" con sim ~0.6).
 *
 * El `WHERE` usa OR entre el match FTS y un umbral de trigram (0.15) para
 * no perder resultados aproximados cuando el tsquery normalizado no
 * matchea por stemming agresivo.
 *
 * El `regconfig` (`spanish` o `simple`) se interpola con `Prisma.raw`
 * porque no puede parametrizarse, pero está whitelisted (solo 2 valores
 * posibles vía Zod) — no hay vector de inyección.
 *
 * Solo devolvemos servicios con `isActive = true`: los pausados por
 * el dueño desde `/panel/servicios` no deben aparecer al cliente en
 * búsqueda pública (mismo criterio que se aplica en el flujo de
 * reserva en `booking.service.createBooking`).
 */

const REGCONFIG_BY_LANG: Record<SearchLanguage, 'spanish' | 'simple' | 'english' | 'german'> = {
  es: 'spanish',
  ca: 'simple',
  en: 'english',
  de: 'german',
};

/** Umbral mínimo de similitud trigram para considerar el match. */
const TRIGRAM_THRESHOLD = 0.15;

export const searchRepository = {
  async searchServices(
    query: string,
    language: SearchLanguage,
    limit: number,
    offset: number,
  ): Promise<ServiceSearchResult[]> {
    const regconfig = Prisma.raw(`'${REGCONFIG_BY_LANG[language]}'::regconfig`);

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        providerId: string;
        categoryId: string;
        professionalId: string | null;
        name: ServiceSearchResult['name'];
        description: ServiceSearchResult['description'];
        priceCents: number;
        durationMinutes: number;
        score: number;
      }>
    >`
      SELECT
        id,
        "providerId",
        "categoryId",
        "professionalId",
        name,
        description,
        "priceCents",
        "durationMinutes",
        (
          0.7 * COALESCE(
            ts_rank_cd(search_vector, websearch_to_tsquery(${regconfig}, ${query})),
            0
          )
          + 0.3 * GREATEST(
            similarity(COALESCE(name->>'es', ''), ${query}),
            similarity(COALESCE(name->>'ca', ''), ${query}),
            similarity(COALESCE(name->>'en', ''), ${query}),
            similarity(COALESCE(name->>'de', ''), ${query})
          )
        )::float8 AS score
      FROM services
      WHERE "deletedAt" IS NULL
        AND "isActive" = true
        AND (
          search_vector @@ websearch_to_tsquery(${regconfig}, ${query})
          OR similarity(COALESCE(name->>'es', ''), ${query}) > ${TRIGRAM_THRESHOLD}
          OR similarity(COALESCE(name->>'ca', ''), ${query}) > ${TRIGRAM_THRESHOLD}
          OR similarity(COALESCE(name->>'en', ''), ${query}) > ${TRIGRAM_THRESHOLD}
          OR similarity(COALESCE(name->>'de', ''), ${query}) > ${TRIGRAM_THRESHOLD}
        )
      ORDER BY score DESC, id ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return rows;
  },

  async searchProviders(
    query: string,
    language: SearchLanguage,
    limit: number,
    offset: number,
  ): Promise<ProviderSearchResult[]> {
    const regconfig = Prisma.raw(`'${REGCONFIG_BY_LANG[language]}'::regconfig`);

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        businessName: string;
        description: ProviderSearchResult['description'];
        address: string;
        ratingAvg: number;
        ratingCount: number;
        score: number;
      }>
    >`
      SELECT
        id,
        slug,
        "businessName",
        description,
        address,
        "ratingAvg",
        "ratingCount",
        (
          0.7 * COALESCE(
            ts_rank_cd(search_vector, websearch_to_tsquery(${regconfig}, ${query})),
            0
          )
          + 0.3 * similarity("businessName", ${query})
        )::float8 AS score
      FROM providers
      WHERE "deletedAt" IS NULL
        AND "verificationStatus" = 'approved'
        AND (
          search_vector @@ websearch_to_tsquery(${regconfig}, ${query})
          OR similarity("businessName", ${query}) > ${TRIGRAM_THRESHOLD}
        )
      ORDER BY score DESC, id ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return rows;
  },
};
