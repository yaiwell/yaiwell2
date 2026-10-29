/**
 * Reglas puras de los pasos del wizard: draft inicial, paso de entrada
 * según el servidor y cuándo está completo cada paso. Sin estado: las
 * usa el hook del orquestador.
 */
import type { AppLocale } from '@/i18n/routing';
// Import directo: el barrel `@/lib/services/plans` arrastra Prisma al bundle del cliente.
import { PLAN_TIERS } from '@/lib/services/plans/plans.types';

import type { SlugStatus } from '../steps/BusinessDataStep';
import {
  businessDataStepSchema,
  businessTypeStepSchema,
  categoriesServiceStepSchema,
  confirmStepSchema,
  locationStepSchema,
} from '../shared';
import type {
  OnboardingApiState,
  OnboardingDraft,
  OnboardingStep,
  PlanTierChoice,
} from '../shared';

/**
 * Estado inicial del draft. Garantiza el `step: 1` para arrancar
 * siempre desde el primer paso si no hay nada que hidratar.
 */
export function emptyDraft(locale: AppLocale, selectedPlan: PlanTierChoice): OnboardingDraft {
  return {
    step: 1,
    locale,
    selectedPlan,
    serviceDurationMinutes: 30,
    servicePriceEuros: 0,
  };
}

/**
 * Salto de paso inicial calculado a partir del `apiState`. Si el
 * usuario ya tiene Provider, saltamos al paso correspondiente para
 * que retomar el flujo sea indoloro.
 */
export function stepFromApiState(state: OnboardingApiState): OnboardingStep {
  if (state.step === 'completed') return 6;
  return state.step;
}

/**
 * Reglas de "paso completo" — habilitan el botón Next del orquestador.
 * Espejo de los schemas Zod pero rápido (sin parseo) para evaluar en
 * cada render sin coste perceptible.
 */
export function isStepReady(
  step: OnboardingStep,
  draft: OnboardingDraft,
  slugStatus: SlugStatus,
): boolean {
  switch (step) {
    case 1:
      return businessTypeStepSchema.safeParse({ businessType: draft.businessType }).success;
    case 2: {
      const parsed = businessDataStepSchema.safeParse({
        businessName: draft.businessName ?? '',
        slug: draft.slug ?? '',
        vatNumber: draft.vatNumber ?? '',
        description: draft.description ?? '',
        priceRange: draft.priceRange,
      });
      // El paso 2 requiere además que el slug esté libre.
      return parsed.success && slugStatus === 'available';
    }
    case 3:
      return locationStepSchema.safeParse({
        address: draft.address ?? '',
        lat: draft.lat,
        lng: draft.lng,
      }).success;
    case 4:
      return categoriesServiceStepSchema.safeParse({
        categoryId: draft.categoryId ?? '',
        serviceName: draft.serviceName ?? '',
        serviceDescription: draft.serviceDescription ?? '',
        serviceDurationMinutes: draft.serviceDurationMinutes ?? 0,
        servicePriceEuros: draft.servicePriceEuros ?? 0,
      }).success;
    case 5:
      return (PLAN_TIERS as readonly string[]).includes(draft.selectedPlan ?? '');
    case 6:
      return confirmStepSchema.safeParse({ termsAccepted: draft.termsAccepted === true }).success;
    default:
      return false;
  }
}
