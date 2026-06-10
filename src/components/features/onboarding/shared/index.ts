/**
 * Fachada del paquete shared del wizard de onboarding.
 *
 * Consumidores (orquestador, steps, page) importan SIEMPRE desde aquí.
 */

export {
  apiCheckSlug,
  apiCreateFirstService,
  apiCreateProvider,
  apiGetState,
  apiSelectPlan,
} from './onboarding.api';

export { clearDraft, DRAFT_STORAGE_KEY, loadDraft, saveDraft } from './onboarding.draft';

export {
  businessDataStepSchema,
  businessTypeStepSchema,
  categoriesServiceStepSchema,
  confirmStepSchema,
  locationStepSchema,
  SLUG_REGEX,
  VAT_REGEX,
} from './onboarding.validation';

export type {
  BusinessType,
  OnboardingApiError,
  OnboardingApiResult,
  OnboardingApiState,
  OnboardingDraft,
  OnboardingInitialProps,
  OnboardingStep,
  PlanTierChoice,
  PriceRangeChoice,
  RootCategory,
} from './onboarding.types';
