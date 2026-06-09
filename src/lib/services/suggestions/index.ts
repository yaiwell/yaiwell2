/**
 * API pública del módulo `suggestions`.
 *
 * Cualquier consumidor (API route, hook React, app móvil) debe importar
 * desde aquí. Importar archivos internos del módulo directamente está
 * prohibido por convención (§6.bis CLAUDE.md).
 */

export { getSuggestions } from './suggestions.service';

export { fetchSuggestions } from './suggestions.client';
export type { FetchSuggestionsOptions, SuggestionsResponse } from './suggestions.client';

export { SuggestionsValidationError, SuggestionsRequestError } from './suggestions.errors';

export type { SuggestionsLanguage } from './suggestions.types';

// Reexportamos los tipos de contenido para que el caller no tenga que
// mezclar imports entre `@/lib/services/suggestions` y `@/lib/fake-data`.
// Cuando migremos a Postgres mantendremos este re-export apuntando al
// nuevo origen (probablemente `./suggestions.types`) y el resto del
// código no se entera.
export type {
  BaseSuggestion,
  CategorySuggestion,
  ProviderSuggestion,
  ServiceSuggestion,
  Suggestion,
  SuggestionLocale,
  SuggestionType,
} from '@/lib/fake-data/search-suggestions';
