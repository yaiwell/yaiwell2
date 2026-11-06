/**
 * Reglas del regalo de Mallorca: quién está en la isla, cuándo acaba, qué
 * horario cuenta y qué aviso toca.
 */
import { describe, expect, it } from 'vitest';

import {
  dueFounderNotice,
  founderSeatEnd,
  hasOpenHours,
  isFounderSeatLocked,
  isInMallorca,
} from './billing.founder-seat.rules';

const NOW = new Date('2027-01-01T04:00:00Z');
const inDays = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

describe('isInMallorca', () => {
  it.each([
    ['Palma', 39.5696, 2.6502, true],
    ['Alcúdia', 39.8531, 3.1214, true],
    ['Maó (Menorca)', 39.8885, 4.2658, false],
    ['Eivissa', 38.9067, 1.4206, false],
    ['Barcelona', 41.3851, 2.1734, false],
  ])('%s', (_name, lat, lng, expected) => {
    expect(isInMallorca(lat, lng)).toBe(expected);
  });
});

describe('founderSeatEnd', () => {
  it('dura 12 meses', () => {
    expect(founderSeatEnd(new Date('2026-11-06T10:00:00Z')).toISOString()).toBe(
      '2027-11-06T10:00:00.000Z',
    );
  });
});

describe('isFounderSeatLocked', () => {
  it('bloquea hasta 24 h antes del final', () => {
    expect(isFounderSeatLocked(inDays(2), NOW)).toBe(true);
    expect(isFounderSeatLocked(inDays(1), NOW)).toBe(false);
    expect(isFounderSeatLocked(inDays(0), NOW)).toBe(false);
  });
});

describe('hasOpenHours', () => {
  it('exige alguna franja', () => {
    expect(hasOpenHours({ monday: [{ open: '09:00', close: '14:00' }], sunday: [] })).toBe(true);
    expect(hasOpenHours({ monday: [], sunday: [] })).toBe(false);
  });

  it('una forma inesperada no regala la plaza', () => {
    expect(hasOpenHours(null)).toBe(false);
    expect(hasOpenHours('lunes')).toBe(false);
  });
});

describe('dueFounderNotice', () => {
  const seat = (
    days: number,
    notified60At: Date | null = null,
    notified15At: Date | null = null,
  ) => ({
    endsAt: inDays(days),
    notified60At,
    notified15At,
  });

  it('nada si aún faltan más de 60 días', () => {
    expect(dueFounderNotice(seat(61), NOW)).toBeNull();
  });

  it('primer aviso a 60 días, una sola vez', () => {
    expect(dueFounderNotice(seat(60), NOW)).toBe('first');
    expect(dueFounderNotice(seat(60, NOW), NOW)).toBeNull();
  });

  it('último aviso a 15 días, una sola vez', () => {
    expect(dueFounderNotice(seat(15, NOW), NOW)).toBe('last');
    expect(dueFounderNotice(seat(15, NOW, NOW), NOW)).toBeNull();
  });

  it('con el cron parado sale solo el último', () => {
    expect(dueFounderNotice(seat(10), NOW)).toBe('last');
  });

  it('vencida no avisa: la cierra el barrido', () => {
    expect(dueFounderNotice(seat(0), NOW)).toBeNull();
  });
});
