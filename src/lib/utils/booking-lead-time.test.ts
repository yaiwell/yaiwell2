import { describe, expect, it } from 'vitest';

import { MIN_BOOKING_LEAD_TIME_MS, isSlotStillBookable } from './booking-lead-time';

/**
 * Tests de la antelación mínima compartida entre servidor y cliente.
 *
 * El valor lo consume el schema Zod que valida la creación de reservas
 * y el flujo de reserva al restaurar un borrador. Si alguien lo cambia
 * en un sitio, aquí se nota.
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');

describe('isSlotStillBookable', () => {
  it('mantiene el umbral en 2 horas', () => {
    expect(MIN_BOOKING_LEAD_TIME_MS).toBe(2 * 60 * 60 * 1000);
  });

  it('acepta un hueco con más de 2 h por delante', () => {
    expect(isSlotStillBookable('2026-10-05T12:00:00.001Z', NOW)).toBe(true);
  });

  it('rechaza el hueco que cae justo en el límite y el que ya pasó', () => {
    expect(isSlotStillBookable('2026-10-05T12:00:00.000Z', NOW)).toBe(false);
    expect(isSlotStillBookable('2026-10-05T11:59:00.000Z', NOW)).toBe(false);
    expect(isSlotStillBookable('2026-10-05T09:00:00.000Z', NOW)).toBe(false);
  });

  it('rechaza una fecha inválida en vez de devolver NaN hacia arriba', () => {
    expect(isSlotStillBookable('no-es-una-fecha', NOW)).toBe(false);
  });
});
