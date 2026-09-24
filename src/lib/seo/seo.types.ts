import type { AppLocale } from '@/i18n/routing';

/**
 * Tipos del módulo SEO.
 *
 * Los tipos de dominio compartidos viven en `@/types/domain`; aquí solo
 * los shapes que describen metadatos de indexación.
 */

/**
 * Mapa `hreflang → URL`. Las claves son los locales soportados más
 * `x-default`, tal y como espera `Metadata.alternates.languages` de
 * Next.js y el atributo `xhtml:link` del sitemap.
 */
export type HreflangMap = Record<AppLocale | 'x-default', string>;

/**
 * Bloque `alternates` listo para inyectar en un `Metadata`.
 *
 * `canonical` es la URL de la página en el locale activo; `languages`
 * lista las cuatro traducciones más el `x-default`.
 */
export interface LocaleAlternates {
  canonical: string;
  languages: HreflangMap;
}

/**
 * Entrada mínima que el sitemap necesita de un proveedor público.
 * Deliberadamente escuálida: el sitemap no pinta nada, solo enlaza.
 */
export interface SitemapProviderRef {
  id: string;
  slug: string;
  updatedAt: Date;
}
