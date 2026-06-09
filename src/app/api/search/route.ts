import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { SearchValidationError, searchProviders, searchServices } from '@/lib/services/search';
import type {
  ProviderSearchResult,
  SearchLanguage,
  ServiceSearchResult,
} from '@/lib/services/search';

/**
 * Endpoint público de búsqueda full-text.
 *
 * Devuelve servicios o proveedores que matcheen `q`, ordenados por el
 * score combinado de FTS + trigram que implementa el repositorio.
 *
 * Diseño:
 *  - Es un endpoint *público* (lo consume la UI de búsqueda sin auth).
 *    No expone datos sensibles: solo proveedores con `verificationStatus
 *    = 'approved'` y servicios activos.
 *  - Validamos con Zod sobre los searchParams crudos para que cualquier
 *    error sintáctico devuelva 400 y no llegue al servicio.
 *  - Capturamos `SearchValidationError` del servicio para mapear a 400
 *    con código tipado; cualquier otro error es 500 inesperado.
 *
 * Contrato:
 *  - `GET /api/search?type=services|providers&q=...&lang=es|ca|en|de
 *     &limit=1..50&offset=0+`
 *  - Respuesta 200: `{ results: T[], total: number, took: number }`
 *    donde `total = results.length` mientras no paginemos en BD (la
 *    paginación real llegará cuando el repo devuelva conteo total).
 *  - Respuesta 400: `{ error: { code, message } }`.
 *  - Respuesta 500: `{ error: { code: 'INTERNAL', message } }`.
 */

const searchParamsSchema = z.object({
  type: z.enum(['services', 'providers']).default('services'),
  q: z.string().min(1, 'Falta el parámetro `q`.'),
  lang: z.enum(['es', 'ca', 'en', 'de']).optional(),
  // `coerce` para los numéricos: los searchParams llegan siempre como
  // strings, no como números.
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

interface SearchSuccess<T> {
  results: T[];
  total: number;
  took: number;
}

interface SearchError {
  error: { code: string; message: string };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SearchSuccess<ServiceSearchResult | ProviderSearchResult> | SearchError>> {
  const started = performance.now();

  // 1. Parseo de la query string con Zod.
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = searchParamsSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: {
          code: 'BAD_REQUEST',
          message: first?.message ?? 'Parámetros de búsqueda inválidos.',
        },
      },
      { status: 400 },
    );
  }

  const { type, q, lang, limit, offset } = parsed.data;
  const language: SearchLanguage = lang ?? 'es';

  // 2. Delegamos al servicio según el `type` seleccionado.
  try {
    const results =
      type === 'services'
        ? await searchServices({ query: q, language, limit, offset })
        : await searchProviders({ query: q, language, limit, offset });

    const took = Math.round(performance.now() - started);
    return NextResponse.json({ results, total: results.length, took });
  } catch (err) {
    if (err instanceof SearchValidationError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 400 },
      );
    }
    // No filtramos el mensaje interno en respuesta para no exponer
    // detalles del motor — Sentry recoge el stack vía global handler.
    console.error('[api/search] error inesperado:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Error inesperado en la búsqueda.' } },
      { status: 500 },
    );
  }
}
