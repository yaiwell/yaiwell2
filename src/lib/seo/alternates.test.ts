import { describe, expect, it } from 'vitest';

import { routing } from '@/i18n/routing';

import {
  buildAlternates,
  buildHreflangMap,
  buildLocalePath,
  buildLocaleUrl,
  X_DEFAULT_LOCALE,
} from './alternates';
import { SITE_URL } from './site-url';

/**
 * Réplica del criterio de redirección del proxy de next-intl con
 * `localePrefix: 'always'`: una ruta de página solo se sirve tal cual
 * si su primer segmento es uno de los locales soportados. Cualquier
 * otra cosa (`/`, `/buscar`, `/centro/...`) es una redirección
 * negociada por `Accept-Language`.
 *
 * Este predicado es el corazón del bug que arreglamos: declarábamos
 * como canónicas URLs que el proxy redirige.
 */
function isServedWithoutRedirect(pathname: string): boolean {
  const [, first] = pathname.split('/');
  return routing.locales.some((locale) => locale === first);
}

const PUBLIC_HREFS = ['/', '/buscar', '/profesionales', '/centro/atelier-norte-abc'];

describe('lib/seo · alternates', () => {
  it('asume `localePrefix: always`; si cambia, hay que revisar este módulo', () => {
    // Guardia explícita: todo lo que viene debajo depende de esta
    // estrategia. La regresión anterior fue justo que routing cambió a
    // 'always' y el SEO se quedó escrito para 'as-needed'.
    expect(routing.localePrefix).toBe('always');
  });

  it('prefija la canónica con el idioma incluso en el locale por defecto', () => {
    expect(buildLocalePath(routing.defaultLocale, '/')).toBe('/es');
    expect(buildLocalePath(routing.defaultLocale, '/buscar')).toBe('/es/buscar');
  });

  it('declara alternativas para TODOS los locales soportados, no solo es/ca', () => {
    const languages = buildHreflangMap('/buscar');

    // Comparamos contra `routing.locales` y no contra una lista literal:
    // añadir un quinto idioma debe hacer fallar esta aserción solo si el
    // helper deja de generarlo, nunca por olvidar actualizar el test.
    for (const locale of routing.locales) {
      expect(languages).toHaveProperty(locale);
    }
    expect(Object.keys(languages).sort()).toEqual(
      [...routing.locales, 'x-default'].map(String).sort(),
    );
    // Los dos mercados que el refactor de 4 idiomas dejó fuera.
    expect(languages.en).toBe('/en/buscar');
    expect(languages.de).toBe('/de/buscar');
  });

  it('apunta x-default al locale por defecto, no a la raíz que redirige', () => {
    const languages = buildHreflangMap('/');

    expect(X_DEFAULT_LOCALE).toBe(routing.defaultLocale);
    expect(languages['x-default']).toBe('/es');
    expect(languages['x-default']).not.toBe('/');
  });

  it('nunca declara como canónica una URL que el proxy redirige', () => {
    for (const href of PUBLIC_HREFS) {
      for (const locale of routing.locales) {
        const { canonical, languages } = buildAlternates(locale, href);

        expect(isServedWithoutRedirect(canonical)).toBe(true);
        // El propio hreflang tampoco puede apuntar a una redirección:
        // Google descarta los destinos que no devuelven 200.
        for (const url of Object.values(languages)) {
          expect(isServedWithoutRedirect(url)).toBe(true);
        }
      }
    }
  });

  it('la canónica de cada locale coincide con su entrada en hreflang', () => {
    for (const href of PUBLIC_HREFS) {
      for (const locale of routing.locales) {
        const { canonical, languages } = buildAlternates(locale, href);
        // Recorremos las entradas en vez de indexar por el locale
        // activo (prohibido por la regla ESLint `no-restricted-syntax`).
        const declared = Object.entries(languages).find(([key]) => key === locale)?.[1];
        expect(declared).toBe(canonical);
      }
    }
  });

  it('genera URLs absolutas sin barra duplicada para el sitemap', () => {
    expect(buildLocaleUrl('de', '/')).toBe(`${SITE_URL}/de`);
    expect(buildLocaleUrl('de', '/buscar')).toBe(`${SITE_URL}/de/buscar`);
    expect(buildHreflangMap('/buscar', true).en).toBe(`${SITE_URL}/en/buscar`);
    expect(SITE_URL.endsWith('/')).toBe(false);
  });
});
