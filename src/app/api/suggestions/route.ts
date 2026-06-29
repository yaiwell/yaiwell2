import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { SuggestionsValidationError } from '@/lib/services/suggestions';
import type { Suggestion } from '@/lib/services/suggestions';
// `getSuggestions` se importa directo del archivo del servicio (no del
// barrel) porque el barrel es client-safe y este símbolo es server-only.
import { getSuggestions } from '@/lib/services/suggestions/suggestions.service';

/**
 * Endpoint público de sugerencias para el autocomplete del buscador.
 *
 * Diseño:
 *  - Endpoint *público* (lo consume la UI sin auth). No expone datos
 *    sensibles: solo categorías, servicios visibles y proveedores.
 *  - Validamos con Zod sobre los searchParams crudos para que cualquier
 *    error sintáctico devuelva 400 y no llegue al servicio.
 *  - Capturamos `SuggestionsValidationError` del servicio para mapear a
 *    400 con código tipado; cualquier otro error es 500 inesperado.
 *  - No filtramos el mensaje interno en respuesta para no exponer
 *    detalles del motor — Sentry recoge el stack vía global handler.
 *
 * Contrato:
 *  - `GET /api/suggestions?q=...&lang=es|ca|en|de`
 *  - Respuesta 200: `{ results: Suggestion[], took: number }`.
 *  - Respuesta 400: `{ error: { code, message } }`.
 *  - Respuesta 500: `{ error: { code: 'INTERNAL', message } }`.
 */

const searchParamsSchema = z.object({
  q: z.string().min(1, 'Falta el parámetro `q`.'),
  lang: z.enum(['es', 'ca', 'en', 'de']).optional(),
});

interface SuggestionsSuccess {
  results: Suggestion[];
  took: number;
}

interface SuggestionsError {
  error: { code: string; message: string };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SuggestionsSuccess | SuggestionsError>> {
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
          message: first?.message ?? 'Parámetros de sugerencias inválidos.',
        },
      },
      { status: 400 },
    );
  }

  const { q, lang } = parsed.data;
  // Default `'es'` alineado con el `defaultLocale` de next-intl.
  const language = lang ?? 'es';

  // 2. Delegamos al servicio.
  try {
    const results = await getSuggestions(q, language);
    const took = Math.round(performance.now() - started);
    return NextResponse.json({ results, took });
  } catch (err) {
    if (err instanceof SuggestionsValidationError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 400 },
      );
    }
    console.error('[api/suggestions] error inesperado:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Error inesperado en las sugerencias.' } },
      { status: 500 },
    );
  }
}
