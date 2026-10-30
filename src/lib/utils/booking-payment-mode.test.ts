import { describe, expect, it } from 'vitest';

import { isOnsiteAllowedByLeadTime } from './booking-payment-mode';

const NOW = new Date('2026-11-02T10:00:00.000Z');
const MIN = 60 * 1000;

describe('isOnsiteAllowedByLeadTime', () => {
  it('a 2h00 justas se permite pagar en el local', () => {
    expect(isOnsiteAllowedByLeadTime(new Date(NOW.getTime() + 120 * MIN), NOW)).toBe(true);
  });

  it('a 1h59 es última hora: solo online', () => {
    expect(isOnsiteAllowedByLeadTime(new Date(NOW.getTime() + 119 * MIN), NOW)).toBe(false);
  });

  it('un milisegundo por debajo de 2 h tampoco', () => {
    expect(isOnsiteAllowedByLeadTime(new Date(NOW.getTime() + 120 * MIN - 1), NOW)).toBe(false);
  });

  it('con días de antelación, sí', () => {
    expect(isOnsiteAllowedByLeadTime(new Date(NOW.getTime() + 3 * 24 * 60 * MIN), NOW)).toBe(true);
  });
});
