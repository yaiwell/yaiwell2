import { pickLocalized } from '@/lib/i18n';
import type { AppLocale } from '@/i18n/routing';
import type { LocalizedText } from '@/types/domain';

import { fakeCategories } from './categories';
import { fakeProviders } from './providers';
import { fakeServices } from './services';

/**
 * Tipos de sugerencia que puede devolver el autocomplete.
 *
 * Mantenemos un discriminator union para que el consumidor pueda
 * decidir el icono, la ruta destino y el badge visual en función
 * del tipo de entidad sin acoplarse al modelo del dominio.
 */
export type SuggestionType = 'category' | 'service' | 'provider';

export interface BaseSuggestion {
  id: string;
  /** Texto principal mostrado en la fila. */
  label: string;
  /** Texto secundario opcional (ej. nombre del centro de un servicio). */
  sublabel?: string;
  /** Rango exacto [inicio, fin) de la coincidencia dentro de `label`. */
  matchRange: [number, number] | null;
}

export interface CategorySuggestion extends BaseSuggestion {
  type: 'category';
  /** Slug navegable de la categoría (para `/buscar?cat=...`). */
  slug: string;
}

export interface ServiceSuggestion extends BaseSuggestion {
  type: 'service';
  /** Slug + id del proveedor para componer la URL `/centro/[slug]-[id]`. */
  providerSlug: string;
  providerId: string;
  serviceId: string;
}

export interface ProviderSuggestion extends BaseSuggestion {
  type: 'provider';
  providerSlug: string;
  providerId: string;
}

export type Suggestion = CategorySuggestion | ServiceSuggestion | ProviderSuggestion;

/** Locales soportados por el autocompletado. */
export type SuggestionLocale = keyof LocalizedText;

/** Máximo de sugerencias devueltas por la función pública. */
const MAX_SUGGESTIONS = 7;

/**
 * Normaliza una cadena para hacer matching insensible a mayúsculas
 * y acentos. Replicamos la lógica que tendrá el `unaccent` de
 * Postgres + `lower()` en la versión real con tsvector.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Devuelve el rango de la primera coincidencia del query dentro del
 * label, calculado sobre la versión normalizada pero referido a la
 * cadena original (los offsets coinciden carácter a carácter porque
 * NFD no elimina caracteres, solo los descompone).
 */
function findMatch(label: string, normalizedQuery: string): [number, number] | null {
  if (normalizedQuery.length === 0) return null;
  const normalized = normalize(label);
  const idx = normalized.indexOf(normalizedQuery);
  if (idx === -1) return null;
  return [idx, idx + normalizedQuery.length];
}

/**
 * Busca sugerencias fake para el autocomplete del buscador.
 *
 * Estrategia (replicable con `pg_trgm` en producción):
 *  1. Normalizamos el query y los textos candidatos.
 *  2. Buscamos coincidencia de subcadena (no fuzzy todavía).
 *  3. Priorizamos categorías, luego servicios, luego proveedores.
 *  4. Limitamos a `MAX_SUGGESTIONS` para no saturar el dropdown.
 *
 * Si el query es vacío o demasiado corto (<2 chars) devolvemos lista
 * vacía para que el caller pueda esconder el dropdown sin lógica extra.
 *
 * @param query — texto introducido por el usuario.
 * @param locale — idioma activo para elegir el texto localizado.
 * @returns lista de sugerencias ordenada por relevancia.
 */
export function searchSuggestions(query: string, locale: SuggestionLocale = 'es'): Suggestion[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const normalizedQuery = normalize(trimmed);
  const results: Suggestion[] = [];

  // 1. Categorías: una sugerencia por cada match.
  for (const category of fakeCategories) {
    if (results.length >= MAX_SUGGESTIONS) break;
    const label = pickLocalized(category.name, locale as AppLocale);
    const match = findMatch(label, normalizedQuery);
    if (match) {
      results.push({
        type: 'category',
        id: `cat-${category.id}`,
        label,
        slug: category.slug,
        matchRange: match,
      });
    }
  }

  // 2. Servicios.
  for (const service of fakeServices) {
    if (results.length >= MAX_SUGGESTIONS) break;
    const label = pickLocalized(service.name, locale as AppLocale);
    const match = findMatch(label, normalizedQuery);
    if (!match) continue;

    const provider = fakeProviders.find((p) => p.id === service.providerId);
    if (!provider) continue;

    results.push({
      type: 'service',
      id: `svc-${service.id}`,
      label,
      sublabel: provider.name,
      providerSlug: provider.slug,
      providerId: provider.id,
      serviceId: service.id,
      matchRange: match,
    });
  }

  // 3. Proveedores (nombre o dirección).
  for (const provider of fakeProviders) {
    if (results.length >= MAX_SUGGESTIONS) break;
    const labelMatch = findMatch(provider.name, normalizedQuery);
    if (labelMatch) {
      results.push({
        type: 'provider',
        id: `prov-${provider.id}`,
        label: provider.name,
        sublabel: provider.address,
        providerSlug: provider.slug,
        providerId: provider.id,
        matchRange: labelMatch,
      });
    }
  }

  return results.slice(0, MAX_SUGGESTIONS);
}
