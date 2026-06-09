/**
 * Cliente HTTP tipado para `GET /api/suggestions`.
 *
 * Lo consumen los hooks de React del autocomplete y se reutilizará tal
 * cual desde la app móvil de Fase 2 — basta con cambiar la base URL
 * inyectada.
 *
 * Decisiones:
 *  - No exporta `fetch` desnudo; expone una función tipada que arma
 *    la query string para que el caller no manipule strings.
 *  - Lanza `SuggestionsRequestError` con `status` y `code` para que la
 *    UI distinga 4xx (esconder dropdown) de 5xx (toast).
 *  - El `signal` es obligatoriamente opcional para que TanStack Query
 *    pueda abortar peticiones obsoletas al cambiar el query rápido.
 *  - Tipo del payload alineado con la respuesta del Route Handler.
 */

import type { Suggestion } from '@/lib/fake-data/search-suggestions';

import { SuggestionsRequestError } from './suggestions.errors';

import type { SuggestionsLanguage } from './suggestions.types';

export interface FetchSuggestionsOptions {
  query: string;
  language?: SuggestionsLanguage;
  /** Signal para abortar la request (lo pasa TanStack Query). */
  signal?: AbortSignal;
}

export interface SuggestionsResponse {
  results: Suggestion[];
  took: number;
}

function buildUrl(options: FetchSuggestionsOptions): string {
  const params = new URLSearchParams({ q: options.query });
  if (options.language) params.set('lang', options.language);
  return `/api/suggestions?${params.toString()}`;
}

/**
 * Llama a `/api/suggestions?q=...&lang=...` y devuelve la lista de
 * sugerencias ordenada por relevancia.
 *
 * @throws SuggestionsRequestError ante status no 2xx.
 */
export async function fetchSuggestions(
  options: FetchSuggestionsOptions,
): Promise<SuggestionsResponse> {
  const res = await fetch(buildUrl(options), {
    signal: options.signal,
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    // Intentamos leer el cuerpo de error pero no rompemos si no es JSON.
    let code = 'SUGGESTIONS_REQUEST_FAILED';
    let message = `Las sugerencias fallaron (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Silenciamos: el status ya marca el error.
    }
    throw new SuggestionsRequestError(message, res.status, code);
  }

  return (await res.json()) as SuggestionsResponse;
}
