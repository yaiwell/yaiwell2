import { describe, expect, it } from 'vitest';

import { formatCommissionRate, formatMonthlyPrice, formatPlanPrice } from './plan-format';

// Intl separa con espacio duro (U+00A0 o U+202F): normalizamos.
const norm = (s: string) => s.replace(/[  ]/g, ' ');

describe('plan-format', () => {
  it('formatea la comisión en basis points', () => {
    expect(norm(formatCommissionRate(1200, 'es'))).toBe('12 %');
    expect(formatCommissionRate(950, 'en')).toBe('9.5%');
  });

  it('formatea la cuota sin símbolo', () => {
    expect(formatMonthlyPrice(1900, 'es')).toBe('19');
    expect(formatMonthlyPrice(1950, 'es')).toBe('19,50');
  });

  it('formatea la cuota con símbolo de euro', () => {
    expect(norm(formatPlanPrice(4900, 'es'))).toBe('49 €');
    expect(formatPlanPrice(4900, 'en')).toBe('€49');
  });
});
