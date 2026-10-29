import type { AppLocale } from '@/i18n/routing';
import type { PublicPlan } from '@/lib/services/plans';

import type { PlanTierChoice } from '../../shared';

/**
 * Paso 5 del wizard: elegir plan. Solo selección; el cobro (si el plan
 * es de pago) ocurre al publicar en el paso 6.
 */
export interface PlanStepProps {
  plans: PublicPlan[];
  value: PlanTierChoice;
  onChange: (tier: PlanTierChoice) => void;
  locale: AppLocale;
}
