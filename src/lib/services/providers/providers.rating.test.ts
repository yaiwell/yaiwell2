import { describe, expect, it } from 'vitest';

import { emptyRatingBreakdown, sumRatingBreakdown, toRatingBreakdown } from './providers.rating';

describe('toRatingBreakdown', () => {
  it('devuelve las cinco notas a cero cuando no hay reseñas', () => {
    // Caso del proveedor recién dado de alta: la UI no debe dividir
    // entre cero ni recibir claves ausentes.
    expect(toRatingBreakdown([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    expect(sumRatingBreakdown(toRatingBreakdown([]))).toBe(0);
  });

  it('cuenta sobre el total real y no sobre una muestra', () => {
    // El bug original: 40 reseñas de 5★ salían como 20 porque el
    // desglose se calculaba sobre las 20 últimas reseñas cargadas.
    const breakdown = toRatingBreakdown([{ rating: 5, count: 40 }]);

    expect(breakdown[5]).toBe(40);
    expect(sumRatingBreakdown(breakdown)).toBe(40);
  });

  it('reparte cada nota en su clave', () => {
    const breakdown = toRatingBreakdown([
      { rating: 5, count: 12 },
      { rating: 4, count: 3 },
      { rating: 1, count: 1 },
    ]);

    expect(breakdown).toEqual({ 1: 1, 2: 0, 3: 0, 4: 3, 5: 12 });
  });

  it('suma las filas repetidas en lugar de sobrescribirlas', () => {
    const breakdown = toRatingBreakdown([
      { rating: 3, count: 2 },
      { rating: 3, count: 5 },
    ]);

    expect(breakdown[3]).toBe(7);
  });

  it('normaliza notas fuera de rango al entero 1-5 más cercano', () => {
    // Defensa ante datos inesperados: nunca debe crear una sexta clave.
    const breakdown = toRatingBreakdown([
      { rating: 0, count: 2 },
      { rating: 7, count: 1 },
      { rating: 4.4, count: 3 },
    ]);

    expect(breakdown).toEqual({ 1: 2, 2: 0, 3: 0, 4: 3, 5: 1 });
  });
});

describe('emptyRatingBreakdown', () => {
  it('devuelve un objeto nuevo en cada llamada', () => {
    const first = emptyRatingBreakdown();
    first[5] = 9;

    expect(emptyRatingBreakdown()[5]).toBe(0);
  });
});
