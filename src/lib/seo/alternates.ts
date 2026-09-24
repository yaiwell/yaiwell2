import { getPathname } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';

import { SITE_URL } from './site-url';
import type { HreflangMap, LocaleAlternates } from './seo.types';

/**
 * Locale al que apunta `x-default`.
 *
 * **Decisión: `x-default` = el locale por defecto (`es`), NO la raíz `/`.**
 *
 * Con `localePrefix: 'always'` la raíz `/` no sirve contenido: el proxy
 * de next-intl responde una redirección cuyo destino depende del
 * `Accept-Language` del visitante. Google exige que todo destino
 * `hreflang` —incluido `x-default`— sea una URL rastreable, que
 * devuelva 200 y que sea auto-canónica; una redirección que además
 * varía por cabecera no cumple ninguna de las tres. Declararla
 * reintroduciría exactamente el bug que este módulo corrige.
 *
 * La otra lectura válida de `x-default` (una página selectora de
 * idioma) tampoco aplica: Yaiwell no tiene esa pantalla, entra directo
 * al marketplace.
 *
 * Queda `es`: es el `defaultLocale`, el mercado primario y la lengua
 * que mejor cubre a cualquier visitante cuyo idioma no soportamos
 * todavía (un francés o un italiano entienden antes una página en
 * castellano que una en catalán o alemán).
 */
export const X_DEFAULT_LOCALE: AppLocale = routing.defaultLocale;

/**
 * Devuelve el pathname localizado de una ruta.
 *
 * Delega en el `getPathname` de next-intl en lugar de concatenar el
 * prefijo a mano: así la estrategia de prefijos (`localePrefix`) y las
 * futuras traducciones de paths (`pathnames`) son la única fuente de
 * verdad. Cambiar `routing.ts` corrige canónicas, hreflang y sitemap a
 * la vez, sin dejar ningún sitio congelado en la estrategia anterior.
 *
 * @param locale — locale destino.
 * @param href — ruta sin prefijo de idioma (`/`, `/buscar`, ...).
 * @returns pathname con prefijo, p. ej. `/de/buscar`.
 */
export function buildLocalePath(locale: AppLocale, href: string): string {
  return getPathname({ href, locale });
}

/**
 * Igual que `buildLocalePath` pero absoluta (con protocolo y host).
 * El protocolo Sitemaps exige URLs absolutas; los `Metadata` de Next
 * admiten relativas porque las resuelve contra `metadataBase`.
 *
 * @param locale — locale destino.
 * @param href — ruta sin prefijo de idioma.
 * @returns URL absoluta, p. ej. `https://yaiwell.com/de/buscar`.
 */
export function buildLocaleUrl(locale: AppLocale, href: string): string {
  return `${SITE_URL}${buildLocalePath(locale, href)}`;
}

/**
 * Construye el mapa `hreflang → URL` de una ruta para los locales
 * soportados.
 *
 * Se genera **iterando `routing.locales`**, nunca escribiendo las
 * claves a mano: añadir un quinto idioma en `routing.ts` lo publica
 * automáticamente en todas las páginas y en el sitemap. La versión
 * anterior listaba `es` y `ca` literalmente y dejó `en` y `de` fuera
 * durante todo el refactor de 4 idiomas.
 *
 * @param href — ruta sin prefijo de idioma.
 * @param absolute — `true` para URLs absolutas (sitemap), `false` para
 *   relativas (metadatos, se resuelven con `metadataBase`).
 * @returns mapa con los locales soportados más `x-default`.
 */
export function buildHreflangMap(href: string, absolute = false): HreflangMap {
  const toUrl = (locale: AppLocale) =>
    absolute ? buildLocaleUrl(locale, href) : buildLocalePath(locale, href);

  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, toUrl(locale)]),
  ) as HreflangMap;

  languages['x-default'] = toUrl(X_DEFAULT_LOCALE);
  return languages;
}

/**
 * Construye el bloque `alternates` de un `Metadata`: canónica del
 * locale activo + hreflang de todos los idiomas.
 *
 * La canónica lleva SIEMPRE prefijo de idioma. Antes se calculaba como
 * `locale === defaultLocale ? '/' : '/${locale}'`, herencia de la
 * estrategia `as-needed`, y eso declaraba como canónica una URL que el
 * proxy redirige — señal contradictoria para los buscadores.
 *
 * @param locale — locale activo de la página.
 * @param href — ruta sin prefijo de idioma (`/`, `/buscar`, ...).
 * @returns objeto listo para `Metadata.alternates`.
 */
export function buildAlternates(locale: AppLocale, href: string): LocaleAlternates {
  return {
    canonical: buildLocalePath(locale, href),
    languages: buildHreflangMap(href),
  };
}
