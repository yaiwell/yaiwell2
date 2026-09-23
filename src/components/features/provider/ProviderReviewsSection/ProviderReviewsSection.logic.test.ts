import { describe, expect, it } from 'vitest';

import { getBreakdownTotal } from './ProviderReviewsSection.logic';

describe('getBreakdownTotal', () => {
  it('usa la suma del desglose como denominador', () => {
    // Regresión del P1: con 40 reseñas de 5★ la barra debe ir al 100%,
    // no al 50% (que es lo que salía al dividir la muestra de 20 entre
    // el total real).
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 40 };

    const total = getBreakdownTotal(breakdown, 40);

    expect(total).toBe(40);
    expect(Math.round((breakdown[5] / total) * 100)).toBe(100);
  });

  it('ignora un reviewsCount desfasado respecto al desglose', () => {
    // `reviewsCount` es el contador denormalizado del proveedor y puede
    // ir por detrás; las barras deben seguir sumando 100% entre ellas.
    const breakdown = { 1: 0, 2: 0, 3: 1, 4: 4, 5: 5 };

    expect(getBreakdownTotal(breakdown, 3)).toBe(10);
  });

  it('nunca devuelve cero cuando no hay ninguna reseña', () => {
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    expect(getBreakdownTotal(breakdown, 0)).toBe(1);
  });

  it('cae a reviewsCount si el desglose llega vacío pero hay reseñas', () => {
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    expect(getBreakdownTotal(breakdown, 7)).toBe(7);
  });
});
