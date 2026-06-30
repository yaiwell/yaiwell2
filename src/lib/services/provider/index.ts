/**
 * API pública del módulo `provider` (operaciones de panel).
 *
 * Consumidores (server actions del `/panel`, futuros route handlers)
 * deben importar desde esta fachada. Importar archivos internos del
 * módulo directamente está prohibido por convención.
 */

export {
  getProviderSchedule,
  updateProviderSchedule,
  updateProviderSettings,
} from './provider.service';

export { providerRepository } from './provider.repository';

export {
  ProviderHasNoProfessionalError,
  ProviderNotFoundError,
  ProviderValidationError,
} from './provider.errors';

export {
  updateProviderSettingsSchema,
  type UpdateProviderSettingsParsed,
} from './provider.validation';

export type { UpdateProviderSettingsInput } from './provider.types';
