import 'server-only';

import { pickLocalized } from '@/lib/i18n';
import { SearchValidationError, searchProviders, searchServices } from '@/lib/services/search';

import { SuggestionsValidationError } from './suggestions.errors';
import { suggestionsRepository } from './suggestions.repository';
import { findMatchRange, normalizeForMatch } from './suggestions.utils';

import type {
  CategorySuggestion,
  ProviderSuggestion,
  ServiceSuggestion,
  Suggestion,
  SuggestionLocale,
} from '@/lib/fake-data/search-suggestions';
import type { LocalizedText } from '@/types/domain';

/**
 * Mínimo de caracteres para que el autocomplete consulte Postgres.
 * Por debajo de 2 chars el FTS devuelve ruido y `websearch_to_tsquery`
 * puede comportarse de forma inestable; el cliente también lo aplica
 * para no hacer el round-trip.
 */
const MIN_QUERY_LENGTH = 2;

/**
 * Tamaños por fuente. La suma (3 + 3 + 2 = 8) es el techo natural del
 * dropdown — el usuario percibe la lista como una "vista rápida", no
 * como una página de resultados (esa la sirve `/buscar`).
 */
const SERVICES_LIMIT = 3;
const PROVIDERS_LIMIT = 3;
const CATEGORIES_LIMIT = 2;

/**
 * Tope defensivo aplicado tras la mezcla para evitar dropdowns
 * desproporcionados si alguno de los límites por fuente cambia.
 */
const MAX_SUGGESTIONS = SERVICES_LIMIT + PROVIDERS_LIMIT + CATEGORIES_LIMIT;

/**
 * Servicio de sugerencias del autocomplete.
 *
 * Combina tres fuentes contra Postgres:
 *  1. Categorías del catálogo (match in-memory tras `findMany`).
 *  2. Servicios vía FTS + trigram (`searchServices`).
 *  3. Proveedores vía FTS + trigram (`searchProviders`).
 *
 * Las tres consultas se lanzan en paralelo con `Promise.all`. El orden
 * final del dropdown es categorías → servicios → proveedores, alineado
 * con la jerarquía de descubrimiento natural: el usuario primero quiere
 * filtrar por tipo de servicio, luego ver opciones concretas, y por
 * último centros.
 *
 * Si `searchServices` o `searchProviders` lanzan `SearchValidationError`
 * (caracteres no permitidos por el motor FTS) reempaquetamos como
 * `SuggestionsValidationError` para que el Route Handler de
 * `/api/suggestions` lo mapee a 400 sin tocar su catch ya existente.
 *
 * @param query texto introducido por el usuario.
 * @param locale idioma activo (uno de los 4 soportados por next-intl).
 * @returns lista de sugerencias ordenada por relevancia (cat → svc → prov).
 * @throws SuggestionsValidationError si el motor de búsqueda rechaza el input.
 */
export async function getSuggestions(
  query: string,
  locale: SuggestionLocale,
): Promise<Suggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  let serviceResults: Awaited<ReturnType<typeof searchServices>>;
  let providerResults: Awaited<ReturnType<typeof searchProviders>>;
  let categoryResults: Awaited<ReturnType<typeof suggestionsRepository.findCategoriesMatching>>;
  try {
    [serviceResults, providerResults, categoryResults] = await Promise.all([
      searchServices({ query: trimmed, language: locale, limit: SERVICES_LIMIT }),
      searchProviders({ query: trimmed, language: locale, limit: PROVIDERS_LIMIT }),
      suggestionsRepository.findCategoriesMatching(trimmed, locale, CATEGORIES_LIMIT),
    ]);
  } catch (err) {
    if (err instanceof SearchValidationError) {
      throw new SuggestionsValidationError(err.message);
    }
    throw err;
  }

  const normalizedQuery = normalizeForMatch(trimmed);

  // Categorías: ya vienen pre-filtradas por la repository.
  const categorySuggestions: CategorySuggestion[] = categoryResults.map((cat) => {
    const label = pickLocalized(cat.name, locale);
    return {
      type: 'category',
      id: `cat-${cat.id}`,
      label,
      slug: cat.slug,
      matchRange: findMatchRange(label, normalizedQuery),
    };
  });

  // Servicios: necesitamos el slug + nombre del centro para `/centro/[slug]-[id]`
  // y el sublabel. Un único lookup batched mantiene el coste en O(1) queries
  // independientemente de cuántos servicios devuelva el FTS.
  const providerIds = Array.from(new Set(serviceResults.map((s) => s.providerId)));
  const providersById = await suggestionsRepository.findProvidersByIds(providerIds);

  const serviceSuggestions: ServiceSuggestion[] = [];
  for (const svc of serviceResults) {
    const provider = providersById.get(svc.providerId);
    if (!provider) continue; // Defensive: provider borrado/soft-deleted entre queries.
    const label = pickLocalized(svc.name as LocalizedText, locale);
    serviceSuggestions.push({
      type: 'service',
      id: `svc-${svc.id}`,
      label,
      sublabel: provider.businessName,
      providerSlug: provider.slug,
      providerId: svc.providerId,
      serviceId: svc.id,
      matchRange: findMatchRange(label, normalizedQuery),
    });
  }

  const providerSuggestions: ProviderSuggestion[] = providerResults.map((p) => ({
    type: 'provider',
    id: `prov-${p.id}`,
    label: p.businessName,
    sublabel: p.address,
    providerSlug: p.slug,
    providerId: p.id,
    matchRange: findMatchRange(p.businessName, normalizedQuery),
  }));

  return [...categorySuggestions, ...serviceSuggestions, ...providerSuggestions].slice(
    0,
    MAX_SUGGESTIONS,
  );
}
