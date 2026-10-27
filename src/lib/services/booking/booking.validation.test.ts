import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBookingSchema, isBookingTooSoonError } from './booking.validation';

/**
 * Tests de la antelación mínima en el borde del servidor.
 *
 * Congelamos el reloj para probar los límites exactos (29:59 / 30:00):
 * el schema compara contra `new Date()` en el momento de validar.
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');

const baseInput = {
  serviceId: '11111111-1111-4111-8111-111111111111',
  professionalId: '22222222-2222-4222-8222-222222222222',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createBookingSchema — antelación mínima', () => {
  it('acepta un hueco que empieza justo a 30:00', () => {
    const result = createBookingSchema.safeParse({
      ...baseInput,
      slotStart: '2026-10-05T10:30:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('acepta una reserva de última hora (a 45 min)', () => {
    const result = createBookingSchema.safeParse({
      ...baseInput,
      slotStart: '2026-10-05T10:45:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza un hueco a 29:59 con un error identificable', () => {
    let caught: unknown = null;
    try {
      createBookingSchema.parse({ ...baseInput, slotStart: '2026-10-05T10:29:59.000Z' });
    } catch (error) {
      caught = error;
    }
    expect(caught).not.toBeNull();
    expect(isBookingTooSoonError(caught)).toBe(true);
  });

  it('no confunde un input malformado con un hueco demasiado próximo', () => {
    let caught: unknown = null;
    try {
      createBookingSchema.parse({ ...baseInput, serviceId: 'no-uuid', slotStart: '2026-10-06' });
    } catch (error) {
      caught = error;
    }
    expect(caught).not.toBeNull();
    expect(isBookingTooSoonError(caught)).toBe(false);
    expect(isBookingTooSoonError(new Error('otra cosa'))).toBe(false);
  });
});
