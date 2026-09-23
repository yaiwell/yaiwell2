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
 * Convierte basis points a porcentaje localizado.
 *
 * 1200 → "12 %" en es, "12%" en en. Usamos `style: 'percent'` en lugar
 * de concatenar "%" para que el separador decimal y el espacio duro
 * antes del signo los ponga Intl según el locale (en castellano la
 * norma es "12 %", en inglés "12%").
 *
 * `maximumFractionDigits: 2` contempla comisiones con medio punto
 * (950 → "9,5 %") sin ensuciar las enteras con ceros de relleno.
 *
 * @param bps — comisión en basis points tal cual está en BD.
 * @param locale — locale activo de next-intl.
 */
export function formatCommissionRate(bps: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(bps / 10_000);
}

/**
 * Convierte céntimos a la cifra de la cuota mensual, sin símbolo de
 * moneda: el "€" lo pinta el markup como elemento tipográfico aparte
 * (queda a un tamaño distinto del número).
 *
 * 1900 → "19"; 1950 → "19,50" en es.
 */
export function formatMonthlyPrice(cents: number, locale: string): string {
  const euros = cents / 100;
  // Si la cuota tiene céntimos queremos los dos dígitos ("19,50",
  // nunca "19,5"); si es redonda, ninguno ("19", nunca "19,00").
  const hasCents = !Number.isInteger(euros);

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(euros);
}
