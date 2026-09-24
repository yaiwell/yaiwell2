/**
 * API pública del módulo SEO.
 *
 * Centraliza canónicas, `hreflang` y metadatos Open Graph para que
 * layout, páginas y sitemap compartan una sola implementación. Si
 * mañana cambia `localePrefix` o se añade un quinto idioma, solo hay
 * que tocar `@/i18n/routing`.
 *
 * Sin dependencias de servidor (Prisma, `server-only`): el barrel lo
 * pueden importar tanto Server Components como el sitemap.
 */

export {
  buildAlternates,
  buildHreflangMap,
  buildLocalePath,
  buildLocaleUrl,
  X_DEFAULT_LOCALE,
} from './alternates';
export { toOpenGraphAlternateLocales, toOpenGraphLocale } from './og-locale';
export { SITE_URL } from './site-url';
export type { HreflangMap, LocaleAlternates, SitemapProviderRef } from './seo.types';
