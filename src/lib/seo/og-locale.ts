import { routing, type AppLocale } from '@/i18n/routing';
import { pickLocalized } from '@/lib/i18n';

/**
 * Equivalencia entre los locales de la app y los códigos
 * `language_TERRITORY` que exige Open Graph para `og:locale`.
 *
 * Los territorios se eligen por mercado real, no por defecto del
 * idioma: `en_GB` (turismo británico e irlandés) en lugar de `en_US`,
 * y `de_DE` como territorio más numeroso del bloque DE/AT/CH.
 *
 * El objeto tiene las cuatro claves garantizadas, así que resolverlo
 * con `pickLocalized` nunca dispara el fallback — lo usamos igualmente
 * porque es el único acceso indexado por locale permitido en el
 * proyecto (regla ESLint `no-restricted-syntax`).
 */
const OPEN_GRAPH_LOCALES: Record<AppLocale, string> = {
  es: 'es_ES',
  ca: 'ca_ES',
  en: 'en_GB',
  de: 'de_DE',
};

/**
 * Devuelve el `og:locale` del locale activo.
 *
 * @param locale — locale activo de la página.
 * @returns código Open Graph, p. ej. `de_DE`.
 */
export function toOpenGraphLocale(locale: AppLocale): string {
  return pickLocalized(OPEN_GRAPH_LOCALES, locale);
}

/**
 * Devuelve los `og:locale:alternate` — todos los idiomas disponibles
 * menos el activo. Es la contrapartida Open Graph del `hreflang`: le
 * dice a Facebook, WhatsApp y LinkedIn que la misma URL existe en
 * otros idiomas.
 *
 * @param locale — locale activo de la página.
 * @returns lista de códigos Open Graph distintos del activo.
 */
export function toOpenGraphAlternateLocales(locale: AppLocale): string[] {
  return routing.locales.filter((l) => l !== locale).map((l) => toOpenGraphLocale(l));
}
