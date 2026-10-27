import { describe, expect, it } from 'vitest';

import { MIN_CANCELLATION_LEAD_MS } from './booking-cancellation';
import {
  LAST_MINUTE_THRESHOLD_MS,
  isLastMinuteAtCreation,
  isLastMinuteBooking,
} from './booking-last-minute';

/**
 * Tests del umbral de reserva de última hora (< 2 h hasta el inicio).
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');

describe('isLastMinuteBooking', () => {
  it('fija el umbral en 2 h y lo comparte con la política de cancelación', () => {
    expect(LAST_MINUTE_THRESHOLD_MS).toBe(2 * 60 * 60 * 1000);
    expect(LAST_MINUTE_THRESHOLD_MS).toBe(MIN_CANCELLATION_LEAD_MS);
  });

  it('marca como última hora un hueco a 1 h 59 min', () => {
    expect(isLastMinuteBooking('2026-10-05T11:59:00.000Z', NOW)).toBe(true);
  });

  it('no marca un hueco a 2 h 00 min ni uno lejano', () => {
    expect(isLastMinuteBooking('2026-10-05T12:00:00.000Z', NOW)).toBe(false);
    expect(isLastMinuteBooking('2026-10-06T10:00:00.000Z', NOW)).toBe(false);
  });

  it('devuelve false con una fecha inválida', () => {
    expect(isLastMinuteBooking('no-es-una-fecha', NOW)).toBe(false);
  });
});

describe('isLastMinuteAtCreation', () => {
  it('compara el inicio con la creación de la reserva, no con el reloj actual', () => {
    const createdAt = new Date('2026-10-05T10:00:00.000Z');
    expect(isLastMinuteAtCreation(new Date('2026-10-05T11:59:00.000Z'), createdAt)).toBe(true);
    expect(isLastMinuteAtCreation(new Date('2026-10-05T12:00:00.000Z'), createdAt)).toBe(false);
  });
});
