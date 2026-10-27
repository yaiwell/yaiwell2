import { describe, expect, it } from 'vitest';

import {
  MIN_BOOKING_LEAD_TIME_MS,
  getEarliestBookableStart,
  isSlotStillBookable,
} from './booking-lead-time';

/**
 * Tests de la antelación mínima compartida entre servidor y cliente.
 *
 * El valor lo consumen el schema Zod que valida la creación de
 * reservas, el motor de disponibilidad y el flujo de reserva al
 * restaurar un borrador. Si alguien lo cambia en un sitio, aquí se nota.
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');

describe('isSlotStillBookable', () => {
  it('mantiene el umbral en 30 minutos', () => {
    expect(MIN_BOOKING_LEAD_TIME_MS).toBe(30 * 60 * 1000);
    expect(getEarliestBookableStart(NOW).toISOString()).toBe('2026-10-05T10:30:00.000Z');
  });

  it('acepta el hueco que cae justo a 30:00 y los posteriores', () => {
    expect(isSlotStillBookable('2026-10-05T10:30:00.000Z', NOW)).toBe(true);
    expect(isSlotStillBookable('2026-10-05T11:00:00.000Z', NOW)).toBe(true);
  });

  it('rechaza el hueco a 29:59 y el que ya pasó', () => {
    expect(isSlotStillBookable('2026-10-05T10:29:59.000Z', NOW)).toBe(false);
    expect(isSlotStillBookable('2026-10-05T09:00:00.000Z', NOW)).toBe(false);
  });

  it('rechaza una fecha inválida en vez de devolver NaN hacia arriba', () => {
    expect(isSlotStillBookable('no-es-una-fecha', NOW)).toBe(false);
  });
});
