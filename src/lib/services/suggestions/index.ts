/**
 * API pública del módulo `suggestions`.
 *
 * Este barrel es **client-safe**: sólo exporta el cliente HTTP, tipos
 * y errores. `getSuggestions` vive en `./suggestions.service` y debe
 * importarse directo desde ahí (el servicio importa Prisma → `pg` →
 * módulos nativos de Node, y bundlearlo a un Client Component arrastra
 * `dns`/`fs`/`net`/`tls` rompiendo el build de Next/Turbopack).
 *
 * Excepción justificada a la convención §6.bis de "importar siempre
 * desde el barrel": los callers server (route handlers, server actions)
 * usan `import { getSuggestions } from '@/lib/services/suggestions/suggestions.service'`.
 * El `'server-only'` marcado en el service garantiza que un Client
 * import accidental falle con error claro en dev en vez de en build.
 */

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
