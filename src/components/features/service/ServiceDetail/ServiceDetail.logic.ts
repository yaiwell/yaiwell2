import type { SupportedLocale } from './ServiceDetail.types';

/**
 * Formatea céntimos a un string monetario localizado en euros.
 *
 * Si el importe es múltiplo exacto de 100 (precio "redondo"), se
 * muestra sin decimales para una lectura más limpia. En caso contrario
 * se muestran dos decimales como dicta la convención monetaria.
 *
 * Replica el formato que usa `ProviderServicesList` para que el precio
 * sea visualmente idéntico al de la lista de servicios; cuando se
 * promueva a util compartida bastará con sustituir esta implementación
 * sin tocar la UI.
 *
 * @param cents — importe en céntimos.
 * @param locale — locale activo (`es` o `ca`).
 * @returns string formateado (ej. "55 €", "32,50 €").
 */
export function formatPriceCents(cents: number, locale: SupportedLocale): string {
  const hasDecimals = cents % 100 !== 0;
  const intlLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(cents / 100);
}
