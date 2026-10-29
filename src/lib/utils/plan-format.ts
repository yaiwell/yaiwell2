/**
 * Formato de las cifras de los planes (cuota y comisión), compartido
 * entre la landing `/profesionales`, el panel y el onboarding.
 *
 * Funciones puras sin dependencias de servidor: seguras en Client
 * Components. Convierten las unidades de BD (basis points, céntimos) a
 * texto localizado; las cifras salen siempre de la tabla `Plan`.
 */

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

/**
 * Cuota mensual con símbolo de euro, para textos corridos del panel
 * ("19 €", "€19" según el locale). Mismo criterio de decimales que
 * `formatMonthlyPrice`.
 */
export function formatPlanPrice(cents: number, locale: string): string {
  const euros = cents / 100;
  const hasCents = !Number.isInteger(euros);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(euros);
}
