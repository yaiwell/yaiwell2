import { describe, expect, it } from 'vitest';

import { canCancelBooking, getLeadTimeMs } from './booking-cancellation';

/**
 * Tests de la política de cancelación (§4.bis de CLAUDE.md).
 *
 * El umbral crítico son las 2 horas exactas: a 2h en punto debe ser
 * cancelable; a 1h 59min queda bloqueada. Cubrimos también los estados
 * no activos (que nunca son cancelables) para evitar regresiones.
 */

const NOW = new Date('2026-05-27T10:00:00+02:00');

function inHours(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

describe('canCancelBooking', () => {
  it('permite cancelar cuando faltan más de 2 horas', () => {
    const result = canCancelBooking({ startAt: inHours(3), status: 'confirmed' }, NOW);

    expect(result).toBe(true);
  });

  it('permite cancelar exactamente en el umbral de 2 horas', () => {
    // Caso límite: a 2h en punto la cancelación SÍ está permitida.
    // El umbral es inclusivo para evitar bloquear por un milisegundo.
    const result = canCancelBooking({ startAt: inHours(2), status: 'confirmed' }, NOW);

    expect(result).toBe(true);
  });

  it('bloquea la cancelación a 1h 59min del inicio', () => {
    // 1h 59min = 1.9833... horas. Por debajo del umbral debe bloquearse
    // tanto en UI como en API según §4.bis.
    const result = canCancelBooking({ startAt: inHours(1 + 59 / 60), status: 'confirmed' }, NOW);

    expect(result).toBe(false);
  });

  it('bloquea la cancelación de reservas ya iniciadas', () => {
    const result = canCancelBooking({ startAt: inHours(-1), status: 'confirmed' }, NOW);

    expect(result).toBe(false);
  });

  it('bloquea la cancelación de reservas en estado completed', () => {
    const result = canCancelBooking({ startAt: inHours(5), status: 'completed' }, NOW);

    expect(result).toBe(false);
  });

  it('bloquea la cancelación de reservas ya canceladas o reembolsadas', () => {
    const cancelled = canCancelBooking({ startAt: inHours(5), status: 'cancelled' }, NOW);
    const refunded = canCancelBooking({ startAt: inHours(5), status: 'refunded' }, NOW);

    expect(cancelled).toBe(false);
    expect(refunded).toBe(false);
  });

  it('permite cancelar reservas en estado pending si hay margen', () => {
    const result = canCancelBooking({ startAt: inHours(24), status: 'pending' }, NOW);

    expect(result).toBe(true);
  });
});

describe('getLeadTimeMs', () => {
  it('devuelve milisegundos positivos para reservas futuras', () => {
    const ms = getLeadTimeMs(inHours(3), NOW);

    expect(ms).toBe(3 * 60 * 60 * 1000);
  });

  it('devuelve milisegundos negativos para reservas pasadas', () => {
    const ms = getLeadTimeMs(inHours(-2), NOW);

    expect(ms).toBeLessThan(0);
  });
});
