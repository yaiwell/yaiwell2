import { describe, expect, it } from 'vitest';

import {
  formatCancellationDeadline,
  formatSlotDateLong,
  formatSlotTimeOnly,
} from './BookingSummary.logic';

/**
 * Los formatos del resumen usan la zona del centro (Europe/Madrid), no
 * la del navegador ni la del runner de tests. Por eso comprobamos la
 * salida para instantes UTC concretos: el resultado debe ser el mismo
 * aunque el CI corra en UTC y el portátil en otra zona.
 */

describe('BookingSummary.logic — zona horaria del centro', () => {
  it('formatea la hora en Madrid en verano (CEST, UTC+2)', () => {
    expect(formatSlotTimeOnly('2026-10-05T08:00:00.000Z', 'es')).toBe('10:00');
  });

  it('formatea la hora en Madrid en invierno (CET, UTC+1)', () => {
    expect(formatSlotTimeOnly('2026-12-01T08:00:00.000Z', 'en')).toBe('09:00');
  });

  it('la fecha larga cae en el día de Madrid aunque en UTC sea el anterior', () => {
    // 23:30Z del 4 de octubre = 01:30 del lunes 5 en Madrid.
    const label = formatSlotDateLong('2026-10-04T23:30:00.000Z', 'es');
    expect(label).toContain('lunes');
    expect(label).toContain('5 de octubre');
    expect(label).toContain('01:30');
  });

  it('la fecha límite de cancelación es el inicio menos 2 h, en hora de Madrid', () => {
    // Inicio 18:00 Madrid (16:00Z) → límite 16:00 Madrid.
    const label = formatCancellationDeadline('2026-10-05T16:00:00.000Z', 'es');
    expect(label).toContain('5 de octubre');
    expect(label).toContain('16:00');
  });
});
