/**
 * Lógica de presentación de ForProvidersPricing.
 *
 * Sin `'use client'`: son funciones puras que se ejecutan durante el
 * render del Server Component. Aquí vive la conversión de las unidades
 * de BD (basis points, céntimos) a texto legible, y el único dato que
 * sigue siendo decisión de marketing: qué plan se destaca.
 */

import type { PricingPlanId, PricingPlanPresentation } from './ForProvidersPricing.types';

/**
 * Metadatos visuales por tier.
 *
 * El plan "Pro" se marca como popular porque es el sweet spot para
 * centros con varios profesionales (target principal Yaiwell). Ojo:
 * aquí NO puede volver a entrar ningún precio ni comisión — esos salen
 * de la tabla `Plan` (ver `plans.service.ts`).
 */
export const PLAN_PRESENTATION: Record<PricingPlanId, PricingPlanPresentation> = {
  free: { popular: false, featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'] },
  basic: { popular: false, featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'] },
  pro: { popular: true, featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'] },
  premium: { popular: false, featureKeys: ['feature1', 'feature2', 'feature3', 'feature4'] },
};

/**
 * El formato de cuota y comisión vive en `@/lib/utils/plan-format`
 * (lo comparten el panel y el onboarding). Se reexporta aquí para no
 * romper a quien lo importaba desde la landing.
 */
export { formatCommissionRate, formatMonthlyPrice } from '@/lib/utils/plan-format';
