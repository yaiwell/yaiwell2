/**
 * API pública del módulo `provider-onboarding` (#57).
 *
 * Consumidores (route handlers, server actions, page del wizard) deben
 * importar desde esta fachada. Importar archivos internos del módulo
 * directamente está prohibido por convención.
 */

export {
  createFirstServiceForProvider,
  createProviderFromOnboarding,
  isSlugAvailable,
  loadOnboardingState,
  selectPlan,
  updateProviderPhotos,
} from './provider-onboarding.service';

export { providerOnboardingRepository } from './provider-onboarding.repository';

export {
  CategoryNotFoundError,
  FreePlanNotSeededError,
  OnboardingAlreadyCompleteError,
  PlanTierNotFoundError,
  ProviderForOnboardingNotFoundError,
  SlugAlreadyTakenError,
} from './provider-onboarding.errors';

export {
  createFirstServiceSchema,
  createProviderSchema,
  selectPlanSchema,
  updatePhotosSchema,
} from './provider-onboarding.validation';

export type {
  CreateFirstServiceParsed,
  CreateProviderParsed,
  SelectPlanParsed,
  UpdatePhotosParsed,
} from './provider-onboarding.validation';

export type {
  BusinessType,
  CreateFirstServiceInput,
  CreateProviderInput,
  OnboardingState,
  PlanTierChoice,
  PriceRangeChoice,
  SelectPlanInput,
  UpdatePhotosInput,
} from './provider-onboarding.types';
