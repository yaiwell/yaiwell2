import { defineRouting } from 'next-intl/routing';

/**
 * Configuración central de routing i18n.
 *
 * Decisión: usamos `localePrefix: 'as-needed'` en lugar de `'always'`.
 *
 * Por qué:
 * - El idioma por defecto es castellano (`es`), nuestro mercado primario.
 * - Servir el contenido en castellano sin prefijo (`/`, `/centro/...`) mejora
 *   la legibilidad de las URLs, evita redirecciones innecesarias para la
 *   mayoría del tráfico y simplifica el SEO en mercado español.
 * - Las URLs en catalán sí llevan prefijo (`/ca/...`), lo que las hace
 *   inequívocas para crawlers y compartibles sin perder el idioma.
 *
 * Si en el futuro añadimos inglés u otros idiomas con peso similar al
 * castellano, podemos revisar esta decisión y pasar a `'always'`.
 */
export const routing = defineRouting({
  locales: ['es', 'ca'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
});

/**
 * Tipo derivado de los locales soportados.
 * Útil para tipar params en páginas y layouts.
 */
export type AppLocale = (typeof routing.locales)[number];
