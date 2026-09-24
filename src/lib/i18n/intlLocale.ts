import type { AppLocale } from '@/i18n/routing';

import { pickLocalized } from './pickLocalized';

/**
 * Equivalencia entre los locales de la app y las etiquetas BCP-47 que
 * espera `Intl` (`DateTimeFormat`, `NumberFormat`, `RelativeTimeFormat`).
 *
 * Los territorios se eligen por mercado, igual que en los `og:locale`
 * de `@/lib/seo`: `en-GB` (turismo británico e irlandés, y formato de
 * fecha día/mes como el resto de Europa) y `de-DE`.
 *
 * Las cuatro claves están garantizadas, así que `pickLocalized` nunca
 * dispara el fallback; lo usamos porque es el único acceso indexado por
 * locale permitido por la regla ESLint `no-restricted-syntax`.
 */
const INTL_LOCALES: Record<AppLocale, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
  en: 'en-GB',
  de: 'de-DE',
};

/**
 * Traduce el locale de la app a la etiqueta BCP-47 de `Intl`.
 *
 * Existe porque media docena de componentes resolvían el formateador
 * con `locale === 'ca' ? 'ca-ES' : 'es-ES'`, residuo de cuando la app
 * solo tenía dos idiomas: a un usuario en `/de` o `/en` se le pintaban
 * las fechas y los precios en castellano.
 *
 * @param locale — locale activo.
 * @returns etiqueta BCP-47, p. ej. `de-DE`.
 */
export function toIntlLocale(locale: AppLocale): string {
  return pickLocalized(INTL_LOCALES, locale);
}
