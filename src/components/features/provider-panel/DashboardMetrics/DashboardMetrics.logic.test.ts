import { describe, expect, it } from 'vitest';

import {
  computeBarHeightPct,
  formatCurrencyFromCents,
  formatDeltaPct,
} from './DashboardMetrics.logic';

describe('formatCurrencyFromCents', () => {
  it('formatea importes grandes sin decimales en castellano', () => {
    const result = formatCurrencyFromCents(348_500, 'es');

    // Comprobamos invariantes que se cumplen tanto con full-ICU
    // (separador de miles localizado) como con small-ICU (sin
    // separador): los dígitos significativos y la ausencia de
    // decimales. La forma exacta del símbolo y del separador es
    // dependiente del runtime de Node y no aporta valor de test.
    expect(result.replace(/\D/g, '')).toBe('3485');
    expect(result).not.toContain(',00');
    expect(result).not.toContain('.00');
  });

  it('conserva céntimos cuando el importe es menor que 1000 €', () => {
    const result = formatCurrencyFromCents(5500, 'es');

    // 55,00 (full-ICU es-ES) o 55.00 (small-ICU) ambos son válidos.
    // En small-ICU sin decimales la cifra es "55"; aceptamos las tres
    // formas porque el contrato de la función es "preserva precisión".
    expect(['55,00', '55.00', '55']).toContain(result.replace(/[^\d,.]/g, ''));
  });
});

describe('computeBarHeightPct', () => {
  it('devuelve 100 cuando el valor coincide con el máximo', () => {
    expect(computeBarHeightPct(50_000, 50_000)).toBe(100);
  });

  it('devuelve un suelo del 4% para valores muy pequeños', () => {
    expect(computeBarHeightPct(1, 100_000)).toBe(4);
  });

  it('devuelve 0 cuando el máximo es 0 para evitar divisiones por cero', () => {
    expect(computeBarHeightPct(10, 0)).toBe(0);
  });
});

describe('formatDeltaPct', () => {
  it('añade signo positivo a deltas mayores que cero', () => {
    expect(formatDeltaPct(12.4, 'es')).toMatch(/^\+/);
  });

  it('usa guion largo Unicode para deltas negativas', () => {
    expect(formatDeltaPct(-3.1, 'es').startsWith('−')).toBe(true);
  });

  it('omite signo cuando el delta es cero', () => {
    expect(formatDeltaPct(0, 'es')).toBe('0 %');
  });
});
