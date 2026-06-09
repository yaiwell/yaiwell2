/**
 * Cliente HTTP tipado para `GET /api/search`.
 *
 * Vive en el lado cliente (lo consumen los hooks de React) y se
 * reutilizará tal cual desde la app móvil de Fase 2 — basta con
 * cambiar la base URL inyectada.
 *
 * Decisiones:
 *  - No exporta el `fetch` desnudo; expone funciones tipadas para que
 *    el caller no manipule la query string a mano.
 *  - Lanza `SearchRequestError` con `status` y `code` para que la UI
 *    pueda decidir entre toast de error vs estado vacío.
 *  - El timeout se delega al caller (TanStack Query gestiona retries
 *    y abort signals).
 */

import type { ProviderSearchResult, SearchLanguage, ServiceSearchResult } from './search.types';

export interface SearchClientOptions {
  query: string;
  language?: SearchLanguage;
  limit?: number;
  offset?: number;
  /** Signal para abortar la request (lo pasa TanStack Query). */
  signal?: AbortSignal;
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
  took: number;
}

/**
 * Error lanzado por el cliente de búsqueda cuando `/api/search`
 * devuelve un status no 2xx o la respuesta no se puede parsear.
 */
export class SearchRequestError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, status: number, code = 'SEARCH_REQUEST_FAILED') {
    super(message);
    this.name = 'SearchRequestError';
    this.status = status;
    this.code = code;
  }
}

function buildUrl(type: 'services' | 'providers', options: SearchClientOptions): string {
  const params = new URLSearchParams({ type, q: options.query });
  if (options.language) params.set('lang', options.language);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  return `/api/search?${params.toString()}`;
}

async function request<T>(url: string, signal?: AbortSignal): Promise<SearchResponse<T>> {
  const res = await fetch(url, { signal, headers: { accept: 'application/json' } });
  if (!res.ok) {
    // Intentamos leer el cuerpo de error pero no rompemos si no es JSON.
    let code = 'SEARCH_REQUEST_FAILED';
    let message = `La búsqueda falló (${res.status}).`;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Silenciamos: el status ya marca el error.
    }
    throw new SearchRequestError(message, res.status, code);
  }
  return (await res.json()) as SearchResponse<T>;
}

/**
 * Llama a `/api/search?type=services&...` y devuelve servicios
 * ordenados por relevancia.
 */
export function fetchServiceSearch(
  options: SearchClientOptions,
): Promise<SearchResponse<ServiceSearchResult>> {
  return request<ServiceSearchResult>(buildUrl('services', options), options.signal);
}

/**
 * Llama a `/api/search?type=providers&...` y devuelve proveedores
 * aprobados ordenados por relevancia.
 */
export function fetchProviderSearch(
  options: SearchClientOptions,
): Promise<SearchResponse<ProviderSearchResult>> {
  return request<ProviderSearchResult>(buildUrl('providers', options), options.signal);
}
