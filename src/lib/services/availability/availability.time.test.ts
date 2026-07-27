import { describe, expect, it } from 'vitest';

import { floorToBucket, getCivilDayUtc, getCivilDaysInWindow } from './availability.time';

const MADRID = 'Europe/Madrid';

/**
 * Estos tests existen por el bug del commit 2bd098e: interpretar el
 * horario en UTC en vez de en hora civil de Madrid desplazaba el día de
 * la semana y aplicaba el horario equivocado en la franja de madrugada.
 */
describe('getCivilDayUtc', () => {
  it('devuelve el día civil correcto a mediodía', () => {
    // 12:00 UTC = 14:00 Madrid (CEST) del mismo día.
    const instant = new Date('2026-07-27T12:00:00.000Z');
    expect(getCivilDayUtc(instant, MADRID).toISOString()).toBe('2026-07-27T00:00:00.000Z');
  });

  it('devuelve el día SIGUIENTE cuando en Madrid ya es de madrugada', () => {
    // 22:30 UTC = 00:30 del día 28 en Madrid (CEST, UTC+2).
    // Usar getUTCDay() sobre el instante daría el día 27: ese era el bug.
    const instant = new Date('2026-07-27T22:30:00.000Z');
    expect(getCivilDayUtc(instant, MADRID).toISOString()).toBe('2026-07-28T00:00:00.000Z');
  });

  it('respeta el horario de invierno (CET, UTC+1)', () => {
    // 23:30 UTC del 28 de marzo = 00:30 del 29 en Madrid (aún CET).
    const instant = new Date('2026-03-28T23:30:00.000Z');
    expect(getCivilDayUtc(instant, MADRID).toISOString()).toBe('2026-03-29T00:00:00.000Z');
  });

  it('respeta el cambio de hora de octubre', () => {
    // 2026-10-25 es el último domingo de octubre (vuelta a CET).
    const instant = new Date('2026-10-25T12:00:00.000Z');
    expect(getCivilDayUtc(instant, MADRID).toISOString()).toBe('2026-10-25T00:00:00.000Z');
  });
});

describe('getCivilDaysInWindow', () => {
  it('devuelve un único día cuando la ventana no cruza medianoche', () => {
    const from = new Date('2026-07-27T08:00:00.000Z'); // 10:00 Madrid
    const to = new Date('2026-07-27T09:00:00.000Z'); // 11:00 Madrid
    const days = getCivilDaysInWindow(from, to, MADRID);
    expect(days.map((d) => d.toISOString())).toEqual(['2026-07-27T00:00:00.000Z']);
  });

  it('devuelve DOS días cuando la ventana cruza la medianoche de Madrid', () => {
    // 21:45 UTC = 23:45 Madrid; +1h se va al día siguiente.
    const from = new Date('2026-07-27T21:45:00.000Z');
    const to = new Date('2026-07-27T22:45:00.000Z');
    const days = getCivilDaysInWindow(from, to, MADRID);
    expect(days.map((d) => d.toISOString())).toEqual([
      '2026-07-27T00:00:00.000Z',
      '2026-07-28T00:00:00.000Z',
    ]);
  });
});

describe('floorToBucket', () => {
  it('redondea hacia abajo al bloque de 5 minutos', () => {
    const instant = new Date('2026-07-27T10:07:43.512Z');
    expect(floorToBucket(instant, 5).toISOString()).toBe('2026-07-27T10:05:00.000Z');
  });

  it('es idempotente', () => {
    const once = floorToBucket(new Date('2026-07-27T10:07:43.512Z'), 5);
    const twice = floorToBucket(once, 5);
    expect(twice.getTime()).toBe(once.getTime());
  });

  it('devuelve el mismo instante si el bucket no es positivo', () => {
    const instant = new Date('2026-07-27T10:07:43.512Z');
    expect(floorToBucket(instant, 0).getTime()).toBe(instant.getTime());
  });
});
