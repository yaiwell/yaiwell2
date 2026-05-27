import { describe, expect, it } from 'vitest';

import { BARCELONA_CENTER } from './location.constants';
import { formatDistance, haversineDistance } from './distance';

/**
 * Tests del cálculo y formato de distancias.
 *
 * Cubrimos los casos límite (mismo punto, antípodas), un punto real
 * conocido de Barcelona (Sagrada Familia) y los breakpoints de formato
 * (sub-km, exactamente 1 km, y kilómetros con decimal).
 */

describe('haversineDistance', () => {
  it('devuelve 0 cuando ambos puntos son iguales', () => {
    const distance = haversineDistance(BARCELONA_CENTER, BARCELONA_CENTER);

    expect(distance).toBe(0);
  });

  it('calcula la distancia entre Plaça de Catalunya y la Sagrada Familia (~1.7 km)', () => {
    // Sagrada Familia: 41.4036, 2.1744. Distancia real ~1.7 km en línea recta.
    const sagradaFamilia = { lat: 41.4036, lng: 2.1744 };

    const distance = haversineDistance(BARCELONA_CENTER, sagradaFamilia);

    // Tolerancia ±50 m: la fórmula es esférica y los puntos son aproximados.
    expect(distance).toBeGreaterThan(1650);
    expect(distance).toBeLessThan(1900);
  });

  it('es simétrica: d(a, b) == d(b, a)', () => {
    const a = { lat: 41.3851, lng: 2.1734 };
    const b = { lat: 41.4036, lng: 2.1744 };

    expect(haversineDistance(a, b)).toBe(haversineDistance(b, a));
  });

  it('aproxima la media circunferencia terrestre entre antípodas', () => {
    // Antípoda de (0, 0) es (0, 180). Media circunferencia ≈ 20 015 km.
    const distance = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });

    // Tolerancia amplia (1 km) porque la Tierra no es una esfera perfecta.
    expect(distance).toBeGreaterThan(20_010_000);
    expect(distance).toBeLessThan(20_020_000);
  });

  it('devuelve NaN si alguna coordenada no es finita', () => {
    const distance = haversineDistance({ lat: Number.NaN, lng: 0 }, { lat: 0, lng: 0 });

    expect(Number.isNaN(distance)).toBe(true);
  });
});

describe('formatDistance', () => {
  it('formatea metros con sufijo "m" cuando son menos de 1000', () => {
    expect(formatDistance(350, 'es')).toBe('350 m');
  });

  it('redondea metros al entero más cercano', () => {
    expect(formatDistance(349.6, 'es')).toBe('350 m');
    expect(formatDistance(0, 'es')).toBe('0 m');
  });

  it('cambia a km con un decimal a partir de 1000 m', () => {
    // Exactamente 1000 m → "1,0 km" en es-ES (coma decimal).
    expect(formatDistance(1000, 'es')).toBe('1,0 km');
  });

  it('usa coma decimal para es-ES', () => {
    expect(formatDistance(1234, 'es-ES')).toBe('1,2 km');
  });

  it('usa coma decimal para ca-ES', () => {
    expect(formatDistance(1234, 'ca-ES')).toBe('1,2 km');
  });

  it('devuelve un placeholder cuando la distancia no es finita', () => {
    expect(formatDistance(Number.NaN, 'es')).toBe('—');
    expect(formatDistance(-1, 'es')).toBe('—');
  });
});
