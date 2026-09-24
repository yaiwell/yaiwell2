import { describe, expect, it } from 'vitest';

import { buildUpcomingDays, getDateKey } from './calendar-days';

/**
 * Tests de los helpers de calendario civil.
 *
 * Venían de `lib/fake-data/booking-slots.test.ts`; se mudan con las
 * funciones al sacarlas de Fase 0.
 */
describe('getDateKey', () => {
  it('compone YYYY-MM-DD con cero a la izquierda', () => {
    const date = new Date(2026, 0, 5); // 5 enero 2026

    expect(getDateKey(date)).toBe('2026-01-05');
  });

  it('usa el día local y no el UTC (no colapsa el día a medianoche)', () => {
    // 31 de diciembre a las 23:30 locales: `toISOString()` daría el día
    // siguiente en cualquier zona al este de Greenwich.
    const lateNight = new Date(2026, 11, 31, 23, 30, 0);

    expect(getDateKey(lateNight)).toBe('2026-12-31');
  });
});

describe('buildUpcomingDays', () => {
  it('devuelve N días consecutivos a partir del día inicial', () => {
    const from = new Date(2026, 4, 20); // 20 mayo 2026

    const days = buildUpcomingDays(from, 7);

    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(20);
    expect(days[6].getDate()).toBe(26);
  });

  it('normaliza la hora a 00:00 para evitar arrastrar minutos del input', () => {
    const fromWithTime = new Date(2026, 4, 20, 17, 42, 11);

    const [first] = buildUpcomingDays(fromWithTime, 1);

    expect(first.getHours()).toBe(0);
    expect(first.getMinutes()).toBe(0);
    expect(first.getSeconds()).toBe(0);
  });

  it('cruza el cambio de mes sin saltarse días', () => {
    const from = new Date(2026, 0, 30); // 30 enero 2026

    const days = buildUpcomingDays(from, 4);

    expect(days.map(getDateKey)).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });
});
