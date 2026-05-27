/**
 * API pública del módulo `providers`.
 *
 * Cualquier consumidor (page, route handler, server action, futura API)
 * debe importar desde aquí. Importar archivos internos directamente
 * está prohibido por convención del proyecto.
 */
export {
  searchProviders,
  getFromPriceCents,
  getProviderDetail,
  getProviderService,
} from './providers.service';
export { providersRepository } from './providers.repository';
export { InvalidSearchFiltersError, ProviderNotFoundError } from './providers.errors';
export type {
  ProviderDetail,
  ProviderServiceDetail,
  RatingBreakdown,
  SearchProvidersFilters,
  SearchProvidersResult,
} from './providers.types';
