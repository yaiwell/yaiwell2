import { searchSuggestions } from '@/lib/fake-data/search-suggestions';
import type { Suggestion, SuggestionLocale } from '@/lib/fake-data/search-suggestions';

/**
 * Servicio de sugerencias del autocomplete.
 *
 * Hoy delega en la implementación fake (`searchSuggestions`) que vive
 * en `@/lib/fake-data`. Mañana, cuando llegue Postgres con tsvector +
 * pg_trgm, solo esta función cambia: el contrato (input / output) se
 * mantiene para que el resto de la app (API route, cliente HTTP, hook
 * React) no tenga que tocarse.
 *
 * Es `async` aunque la fuente actual sea síncrona para preparar el
 * futuro y evitar un cambio de firma breaking más adelante.
 *
 * @param query texto introducido por el usuario.
 * @param locale idioma activo (uno de los 4 soportados por next-intl).
 * @returns lista de sugerencias ordenada por relevancia.
 */
export async function getSuggestions(
  query: string,
  locale: SuggestionLocale,
): Promise<Suggestion[]> {
  return searchSuggestions(query, locale);
}
