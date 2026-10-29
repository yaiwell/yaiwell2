import { describe, expect, it } from 'vitest';

import {
  getMadridDayRange,
  addDaysToDateKey,
  getMadridDateKey,
  getMadridWeekRange,
  getMadridWeekStartKey,
  getWeekDateKeys,
  parseWeekParam,
} from './madrid-week';

describe('getMadridDateKey', () => {
  it('usa el día de Madrid, no el de UTC', () => {
    // Domingo 23:30 UTC en invierno = lunes 00:30 en Madrid.
    expect(getMadridDateKey(new Date('2026-01-11T23:30:00.000Z'))).toBe('2026-01-12');
    // Verano: 22:30 UTC = 00:30 del día siguiente en Madrid.
    expect(getMadridDateKey(new Date('2026-07-12T22:30:00.000Z'))).toBe('2026-07-13');
  });
});

describe('getMadridWeekStartKey', () => {
  it('lleva cualquier día a su lunes', () => {
    expect(getMadridWeekStartKey(new Date('2026-01-14T10:00:00.000Z'))).toBe('2026-01-12');
    expect(getMadridWeekStartKey(new Date('2026-01-18T22:59:00.000Z'))).toBe('2026-01-12');
    // Domingo 23:00 UTC ya es lunes en Madrid: semana siguiente.
    expect(getMadridWeekStartKey(new Date('2026-01-18T23:00:00.000Z'))).toBe('2026-01-19');
  });
});

describe('getMadridWeekRange', () => {
  it('corta la semana en la medianoche de Madrid en invierno', () => {
    const { start, end } = getMadridWeekRange('2026-01-12');
    expect(start.toISOString()).toBe('2026-01-11T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-01-18T23:00:00.000Z');
  });

  it('corta la semana en la medianoche de Madrid en verano', () => {
    const { start } = getMadridWeekRange('2026-07-13');
    expect(start.toISOString()).toBe('2026-07-12T22:00:00.000Z');
  });

  it('la semana del cambio a horario de verano dura 167 horas', () => {
    // El domingo 29 de marzo de 2026 Madrid pasa de UTC+1 a UTC+2.
    const { start, end } = getMadridWeekRange('2026-03-23');
    expect(start.toISOString()).toBe('2026-03-22T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-29T22:00:00.000Z');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(167);
  });

  it('la semana del cambio a horario de invierno dura 169 horas', () => {
    // El domingo 25 de octubre de 2026 Madrid vuelve a UTC+1.
    const { start, end } = getMadridWeekRange('2026-10-19');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(169);
  });
});

describe('getMadridDayRange', () => {
  it('un día normal de invierno va de 23:00 a 23:00 UTC', () => {
    expect(getMadridDayRange('2026-11-10')).toEqual({
      start: new Date('2026-11-09T23:00:00.000Z'),
      end: new Date('2026-11-10T23:00:00.000Z'),
    });
  });

  it('el día del cambio a verano dura 23 h', () => {
    const { start, end } = getMadridDayRange('2026-03-29');
    expect(start).toEqual(new Date('2026-03-28T23:00:00.000Z'));
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it('el día del cambio a invierno dura 25 h', () => {
    const { start, end } = getMadridDayRange('2026-10-25');
    expect(start).toEqual(new Date('2026-10-24T22:00:00.000Z'));
    expect(end.getTime() - start.getTime()).toBe(25 * 60 * 60 * 1000);
  });
});

describe('getWeekDateKeys / addDaysToDateKey', () => {
  it('devuelve los 7 días cruzando de mes', () => {
    expect(getWeekDateKeys('2026-10-26')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
    expect(addDaysToDateKey('2026-01-05', -7)).toBe('2025-12-29');
  });
});

describe('parseWeekParam', () => {
  const now = new Date('2026-10-27T10:00:00.000Z');

  it('normaliza cualquier día a su lunes', () => {
    expect(parseWeekParam('2026-11-05', now)).toBe('2026-11-02');
    expect(parseWeekParam('2026-11-02', now)).toBe('2026-11-02');
  });

  it('cae en la semana actual con valores ausentes o inválidos', () => {
    for (const raw of [
      undefined,
      '',
      'mañana',
      '2026-02-31',
      '2026-13-01',
      ['2026-11-02'],
      '0000-01-01',
      '0050-06-13',
      '9999-12-31',
    ]) {
      expect(parseWeekParam(raw, now)).toBe('2026-10-26');
    }
  });
});
