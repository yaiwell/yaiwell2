/**
 * API pública del módulo `search`.
 *
 * Cualquier consumidor (API routes, server actions, paneles) debe
 * importar desde aquí. Importar archivos internos del módulo
 * directamente está prohibido por convención (§6.bis CLAUDE.md).
 */

export { searchProviders, searchServices } from './search.service';

export { searchRepository } from './search.repository';

export { SearchValidationError } from './search.errors';

export type {
  ProviderSearchResult,
  SearchLanguage,
  SearchOptions,
  ServiceSearchResult,
} from './search.types';
