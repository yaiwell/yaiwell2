/**
 * Tipos del dominio de búsqueda full-text.
 *
 * El motor combina dos señales: ranking FTS (`ts_rank_cd` sobre el
 * tsvector materializado en `search_vector`) y similitud trigram
 * (`similarity()`) sobre el campo principal en el idioma elegido.
 */

import type { LocalizedText } from '@/types/domain';

export type SearchLanguage = 'es' | 'ca';

export interface SearchOptions {
  /** Texto introducido por el usuario. Se sanitiza en la validación. */
  query: string;
  /** Idioma para elegir el `regconfig` (`spanish` o `simple`). */
  language?: SearchLanguage;
  /** Tamaño de página (max 50). */
  limit?: number;
  /** Desplazamiento para paginación. */
  offset?: number;
}

export interface ServiceSearchResult {
  id: string;
  providerId: string;
  categoryId: string;
  professionalId: string | null;
  name: LocalizedText;
  description: LocalizedText;
  priceCents: number;
  durationMinutes: number;
  /** Score combinado FTS+trigram (0..~1, mayor = más relevante). */
  score: number;
}

export interface ProviderSearchResult {
  id: string;
  slug: string;
  businessName: string;
  description: LocalizedText;
  address: string;
  ratingAvg: number;
  ratingCount: number;
  /** Score combinado FTS+trigram. */
  score: number;
}
