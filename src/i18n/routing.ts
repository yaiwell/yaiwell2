import { defineRouting } from 'next-intl/routing';

/**
 * Configuración central de routing i18n.
 *
 * Locales soportados (orden = prioridad de mercado):
 *  - `es` castellano — residentes y por defecto histórico.
 *  - `ca` catalán — variante mallorquí presente en el día a día local.
 *  - `en` inglés — turismo británico/irlandés/internacional.
 *  - `de` alemán — turismo alemán/austríaco/suizo (segmento alto en
 *    Mallorca, especialmente sur y costa).
 *
 * **Decisión `localePrefix: 'always'`**: con 4 idiomas casi paritarios en
 * peso de mercado preferimos que la URL refleje siempre el idioma activo
 * (`/es/...`, `/ca/...`, `/en/...`, `/de/...`). Aterrizar a un turista
 * alemán en `/` (que servía `es` con la estrategia `as-needed`) era una
 * UX rota: el usuario tenía que descubrir el switcher antes de poder leer
 * la página. Con `always`:
 *  - el middleware de next-intl negocia el idioma desde `Accept-Language`
 *    y redirige a `/es`, `/ca`, `/en` o `/de` según corresponda;
 *  - los crawlers no pueden confundir contenido entre idiomas;
 *  - las hreflang tags apuntan a URLs canónicas inequívocas.
 */
export const routing = defineRouting({
  locales: ['es', 'ca', 'en', 'de'],
  defaultLocale: 'es',
  localePrefix: 'always',
});

/**
 * Tipo derivado de los locales soportados.
 * Útil para tipar params en páginas y layouts.
 */
export type AppLocale = (typeof routing.locales)[number];
