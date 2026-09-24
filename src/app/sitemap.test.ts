import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/seo';

// El sitemap consulta BD; mockeamos el repositorio para que el test sea
// determinista y no necesite Postgres.
const findAllForSitemap = vi.fn();
vi.mock('@/lib/services/providers', () => ({
  providersRepository: {
    findAllForSitemap: (limit: number) => findAllForSitemap(limit),
  },
}));

import sitemap from './sitemap';

const PROVIDER = {
  id: '11111111-2222-3333-4444-555555555555',
  slug: 'atelier-norte',
  updatedAt: new Date('2026-09-01T10:00:00Z'),
};

/**
 * Misma regla que aplica el proxy con `localePrefix: 'always'`: una URL
 * solo se sirve sin redirección si su primer segmento de path es un
 * locale soportado.
 */
function isServedWithoutRedirect(absoluteUrl: string): boolean {
  const { pathname } = new URL(absoluteUrl);
  const [, first] = pathname.split('/');
  return routing.locales.some((locale) => locale === first);
}

describe('app/sitemap', () => {
  beforeEach(() => {
    findAllForSitemap.mockReset();
    findAllForSitemap.mockResolvedValue([PROVIDER]);
  });

  it('publica una entrada por ruta y locale, todas con prefijo de idioma', async () => {
    const entries = await sitemap();

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith(SITE_URL)).toBe(true);
      // La regresión que arreglamos: el sitemap publicaba
      // `https://host/` y `https://host/buscar` como URLs de castellano
      // y las cuatro redirigían.
      expect(isServedWithoutRedirect(entry.url)).toBe(true);
    }
    expect(entries.map((e) => e.url)).toContain(`${SITE_URL}/es`);
    expect(entries.map((e) => e.url)).not.toContain(`${SITE_URL}/`);
  });

  it('declara hreflang de los cuatro locales más x-default en cada entrada', async () => {
    const entries = await sitemap();

    for (const entry of entries) {
      const languages = entry.alternates?.languages ?? {};
      expect(Object.keys(languages).sort()).toEqual(
        [...routing.locales, 'x-default'].map(String).sort(),
      );
      for (const url of Object.values(languages)) {
        expect(isServedWithoutRedirect(String(url))).toBe(true);
      }
    }
  });

  it('incluye las fichas de centro en los cuatro idiomas', async () => {
    const entries = await sitemap();
    const providerUrls = entries
      .map((e) => e.url)
      .filter((url) => url.includes(`/centro/${PROVIDER.slug}-${PROVIDER.id}`));

    expect(providerUrls).toHaveLength(routing.locales.length);
    expect(providerUrls).toContain(`${SITE_URL}/de/centro/${PROVIDER.slug}-${PROVIDER.id}`);
  });

  it('pide a BD como mucho el cupo de 50.000 URLs repartido entre locales', async () => {
    await sitemap();

    const [limit] = findAllForSitemap.mock.calls[0];
    expect(limit).toBeLessThanOrEqual(50_000 / routing.locales.length);
    expect(limit).toBeGreaterThan(0);
  });

  it('no lista áreas privadas', async () => {
    const entries = await sitemap();
    const paths = entries.map((e) => new URL(e.url).pathname);

    for (const path of paths) {
      expect(path).not.toMatch(/\/(panel|mis-reservas|cuenta|admin|onboarding)(\/|$)/);
    }
  });

  it('degrada a las rutas estáticas si la BD falla, sin tumbar el sitemap', async () => {
    findAllForSitemap.mockRejectedValue(new Error('connection refused'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const entries = await sitemap();

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => !e.url.includes('/centro/'))).toBe(true);
    errorSpy.mockRestore();
  });
});
