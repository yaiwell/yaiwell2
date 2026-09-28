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
  priceRange: [],
  minRating: null,
  nearMeOnly: false,
};

describe('buildSearchParams / parseSearchParams', () => {
  it('devuelve cadena vacía cuando todo está en su valor por defecto', () => {
    expect(buildSearchParams(emptyState)).toBe('');
  });

  it('emite near=me cuando "Cerca de ti" está activo', () => {
    expect(buildSearchParams({ ...emptyState, nearMeOnly: true })).toBe('?near=me');
  });

  it('conserva todos los filtros, incluido near, en un viaje de ida y vuelta', () => {
    const state: SearchUrlState = {
      query: 'corte de pelo',
      categorySlug: 'manicura-pedicura',
      availabilityOnly: true,
      priceRange: ['€', '€€€'],
      minRating: 4.5,
      nearMeOnly: true,
    };

    expect(parseSearchParams(toRaw(buildSearchParams(state)))).toEqual(state);
  });

  it('ignora valores inválidos en vez de inventar filtros', () => {
    const parsed = parseSearchParams({
      price: '€,barato,€€',
      rating: 'mucho',
      near: 'yes',
      cat: '',
      now: 'quizá',
    });

    expect(parsed).toEqual({ ...emptyState, priceRange: ['€', '€€'] });
  });

  it('acepta now=true además de now=1 y descarta parámetros repetidos', () => {
    expect(parseSearchParams({ now: 'true' }).availabilityOnly).toBe(true);
    expect(parseSearchParams({ q: ['a', 'b'] }).query).toBe('');
  });
});
