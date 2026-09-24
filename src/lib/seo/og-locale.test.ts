import { describe, expect, it } from 'vitest';

import { routing } from '@/i18n/routing';

import { toOpenGraphAlternateLocales, toOpenGraphLocale } from './og-locale';

describe('lib/seo · og-locale', () => {
  it('mapea los cuatro locales a un código language_TERRITORY', () => {
    expect(toOpenGraphLocale('es')).toBe('es_ES');
    expect(toOpenGraphLocale('ca')).toBe('ca_ES');
    expect(toOpenGraphLocale('en')).toBe('en_GB');
    expect(toOpenGraphLocale('de')).toBe('de_DE');
  });

  it('no deja ningún locale sin mapear', () => {
    for (const locale of routing.locales) {
      expect(toOpenGraphLocale(locale)).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    }
  });

  it('declara como alternativos todos los idiomas menos el activo', () => {
    const alternates = toOpenGraphAlternateLocales('de');

    expect(alternates).toHaveLength(routing.locales.length - 1);
    expect(alternates).not.toContain('de_DE');
    expect(alternates).toContain('en_GB');
  });
});
