import type { SupportedLocale } from './DashboardMetrics.types';

/**
 * Formatea un valor en céntimos como precio localizado (es-ES / ca-ES).
 *
 * Centralizamos el formateador aquí en vez de en `Intl.NumberFormat`
 * inline para que el componente JSX quede limpio y para poder probarlo
 * en unit tests sin depender del DOM.
 *
 * @param cents — importe en céntimos (entero o decimal).
 * @param locale — locale activo (`es` o `ca`).
 * @returns string formateado con símbolo €, sin decimales para >=1000.
 */
export function formatCurrencyFromCents(cents: number, locale: SupportedLocale): string {
  const intlLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';
  const amount = cents / 100;
  // Sin decimales cuando el importe es grande para no ensuciar la card.
  // Por debajo de 1000 conservamos 2 decimales (los precios típicos
  // del marketplace suelen tener céntimos relevantes, ej. 38,00 €).
  const maximumFractionDigits = amount >= 1000 ? 0 : 2;
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Devuelve el porcentaje (0-100) que representa `value` respecto al
 * máximo de la serie. Se usa para calcular la altura relativa de las
 * barras de la mini-gráfica.
 *
 * Si `max` es 0, devuelve 0 para evitar divisiones por cero.
 */
export function computeBarHeightPct(value: number, max: number): number {
  if (max <= 0) return 0;
  const pct = Math.round((value / max) * 100);
  // Suelo del 4% para que valores muy bajos sigan siendo visibles.
  return Math.max(pct, 4);
}

/**
 * Formatea un delta porcentual con signo, redondeado a 1 decimal.
 * Ejemplo: 12.4 → "+12,4 %", -5 → "-5 %".
 */
export function formatDeltaPct(delta: number, locale: SupportedLocale): string {
  const intlLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const formatted = new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(Math.abs(delta));
  return `${sign}${formatted} %`;
}
