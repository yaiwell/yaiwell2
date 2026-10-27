import { describe, expect, it } from 'vitest';

import { formatRatingValue, getRatingDisplay, hasPublicRating, roundRatingAverage } from './rating';

describe('getRatingDisplay', () => {
  it('sin reseñas devuelve «nuevo», aunque la media venga con valor', () => {
    expect(getRatingDisplay(0, 0)).toEqual({ kind: 'new' });
    // Caché antigua con nota inventada y contador a 0: no la enseñamos.
    expect(getRatingDisplay(4.8, 0)).toEqual({ kind: 'new' });
  });

  it('trata contadores negativos o no finitos como «nuevo»', () => {
    expect(getRatingDisplay(4.5, -1)).toEqual({ kind: 'new' });
    expect(getRatingDisplay(4.5, Number.NaN)).toEqual({ kind: 'new' });
    expect(getRatingDisplay(4.5, Number.POSITIVE_INFINITY)).toEqual({ kind: 'new' });
  });

  it('no da nota si hay reseñas pero la media es incoherente', () => {
    // Con reseñas de 1-5★ la media nunca baja de 1.
    expect(getRatingDisplay(0, 3)).toEqual({ kind: 'new' });
    expect(getRatingDisplay(Number.NaN, 3)).toEqual({ kind: 'new' });
  });

  it('devuelve la media y el contador en los límites 1 y 5', () => {
    expect(getRatingDisplay(1, 1)).toEqual({ kind: 'rated', value: 1, count: 1 });
    expect(getRatingDisplay(5, 1)).toEqual({ kind: 'rated', value: 5, count: 1 });
  });

  it('acota medias por encima de 5 y trunca contadores no enteros', () => {
    expect(getRatingDisplay(5.2, 4)).toEqual({ kind: 'rated', value: 5, count: 4 });
    expect(getRatingDisplay(4, 2.7)).toEqual({ kind: 'rated', value: 4, count: 2 });
  });
});

describe('hasPublicRating', () => {
  it('solo es true con reseñas y media válida', () => {
    expect(hasPublicRating(4.8, 0)).toBe(false);
    expect(hasPublicRating(0, 0)).toBe(false);
    expect(hasPublicRating(4.8, 3)).toBe(true);
  });
});

describe('roundRatingAverage', () => {
  it('devuelve 0 sin notas', () => {
    expect(roundRatingAverage([])).toBe(0);
  });

  it('redondea la mitad hacia arriba como ROUND de Postgres', () => {
    // 17 / 4 = 4.25 → 4.3
    expect(roundRatingAverage([5, 4, 4, 4])).toBe(4.3);
    // 7 / 2 = 3.5 → 3.5 (ya tiene 1 decimal)
    expect(roundRatingAverage([3, 4])).toBe(3.5);
    // 14 / 3 = 4.666… → 4.7
    expect(roundRatingAverage([5, 5, 4])).toBe(4.7);
    // 13 / 3 = 4.333… → 4.3
    expect(roundRatingAverage([5, 4, 4])).toBe(4.3);
  });
});

describe('formatRatingValue', () => {
  it('usa coma decimal en es, ca y de, y punto en en', () => {
    expect(formatRatingValue(4.8, 'es')).toBe('4,8');
    expect(formatRatingValue(4.8, 'ca')).toBe('4,8');
    expect(formatRatingValue(4.8, 'de')).toBe('4,8');
    expect(formatRatingValue(4.8, 'en')).toBe('4.8');
  });

  it('siempre pinta un decimal', () => {
    expect(formatRatingValue(5, 'es')).toBe('5,0');
    expect(formatRatingValue(4.25, 'en')).toBe('4.3');
  });
});
