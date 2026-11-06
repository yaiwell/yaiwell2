import { describe, expect, it } from 'vitest';

import type { SearchUrlState } from './SearchView.types';
import { buildSearchParams, parseSearchParams } from './SearchView.url';

/**
 * Tests de la serialización de la URL de `/buscar`.
 *
 * El caso que motivó el módulo: `near=me` se leía al entrar pero
 * `buildSearchParams` no lo volvía a escribir, así que cualquier otro
 * filtro borraba "Cerca de ti" de la URL. El test de ida y vuelta
 * garantiza que ningún campo se pierde en ninguno de los dos sentidos.
 */

/** Convierte `?a=b` al objeto que entrega Next.js en `searchParams`. */
function toRaw(qs: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(qs.replace(/^\?/, '')));
}

const emptyState: SearchUrlState = {
  query: '',
  categorySlug: null,
  availabilityOnly: false,
  discountOnly: false,
  when: null,
  days: [],
  priceRange: [],
  minRating: null,
  nearMeOnly: false,
};

describe('buildSearchParams / parseSearchParams', () => {
  it('devuelve cadena vacía cuando todo está en su valor por defecto', () => {
    expect(buildSearchParams(emptyState)).toBe('');
  });

  it('ignora un when desconocido en vez de inventar un filtro', () => {
    expect(parseSearchParams({ when: 'ayer' }).when).toBeNull();
    expect(parseSearchParams({ when: 'tomorrow' }).when).toBe('tomorrow');
  });

  it('emite near=me cuando "Cerca de ti" está activo', () => {
    expect(buildSearchParams({ ...emptyState, nearMeOnly: true })).toBe('?near=me');
  });

  it('conserva todos los filtros, incluido near, en un viaje de ida y vuelta', () => {
    const state: SearchUrlState = {
      query: 'corte de pelo',
      categorySlug: 'manicura-pedicura',
      availabilityOnly: true,
      discountOnly: true,
      when: 'this-week',
      days: [],
      priceRange: ['€', '€€€'],
      minRating: 4.5,
      nearMeOnly: true,
    };

    expect(parseSearchParams(toRaw(buildSearchParams(state)))).toEqual(state);
  });

  it('conserva los días elegidos en un viaje de ida y vuelta', () => {
    const state = { ...emptyState, days: ['2026-11-08', '2026-11-12'] };

    expect(parseSearchParams(toRaw(buildSearchParams(state)))).toEqual(state);
  });

  it('si llegan días y rango, mandan los días', () => {
    const parsed = parseSearchParams({ days: '2026-11-08', when: 'today' });

    expect(parsed.days).toEqual(['2026-11-08']);
    expect(parsed.when).toBeNull();
  });

  it('descarta días inválidos, repetidos y los que pasan del máximo', () => {
    const parsed = parseSearchParams({
      days: '2026-11-09,2026-02-31,mañana,2026-11-08,2026-11-09',
    });
    expect(parsed.days).toEqual(['2026-11-08', '2026-11-09']);

    const many = Array.from({ length: 9 }, (_, i) => `2026-11-1${i}`).join(',');
    expect(parseSearchParams({ days: many }).days).toHaveLength(7);
  });

  it('ignora valores inválidos en vez de inventar filtros', () => {
    const parsed = parseSearchParams({
      price: '€,barato,€€',
      rating: 'mucho',
      near: 'yes',
      cat: '',
      now: 'quizá',
      discount: 'sí',
    });

    expect(parsed).toEqual({ ...emptyState, priceRange: ['€', '€€'] });
  });

  it('emite discount=1 con el filtro «Con descuento» y lo lee de vuelta', () => {
    expect(buildSearchParams({ ...emptyState, discountOnly: true })).toBe('?discount=1');
    expect(parseSearchParams({ discount: '1' }).discountOnly).toBe(true);
    expect(parseSearchParams({ discount: 'true' }).discountOnly).toBe(true);
    expect(parseSearchParams({ discount: ['1', '1'] }).discountOnly).toBe(false);
  });

  it('acepta now=true además de now=1 y descarta parámetros repetidos', () => {
    expect(parseSearchParams({ now: 'true' }).availabilityOnly).toBe(true);
    expect(parseSearchParams({ q: ['a', 'b'] }).query).toBe('');
  });
});
