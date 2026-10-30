import { describe, expect, it } from 'vitest';

import { formatShortDayMonth } from './short-date';

describe('formatShortDayMonth', () => {
  // 23:30 UTC del 9 de febrero = 00:30 del 10 en Madrid.
  const DATE = new Date('2027-02-09T23:30:00.000Z');

  it('rellena día y mes a dos dígitos en castellano', () => {
    expect(formatShortDayMonth(DATE, 'es-ES', 'Europe/Madrid')).toBe('10/02');
  });

  it('respeta el separador de cada idioma', () => {
    expect(formatShortDayMonth(DATE, 'de-DE', 'Europe/Madrid')).toBe('10.02.');
    expect(formatShortDayMonth(DATE, 'en-GB', 'Europe/Madrid')).toBe('10/02');
  });
});
