import { describe, expect, it } from 'vitest';

import type { WeeklySchedule } from '@/lib/services/availability/availability.types';

import { computeOccupancyPct } from './dashboard-occupancy';

// Semana del lunes 1 de junio de 2026 (CEST, UTC+2).
const WEEK = '2026-06-01';

function onlyMonday(open: string, close: string): WeeklySchedule {
  return {
    monday: [{ open, close }],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

const at = (iso: string) => new Date(iso);

describe('computeOccupancyPct', () => {
  it('reservado entre horas abiertas, en hora de Madrid', () => {
    // Lunes 10:00-14:00 Madrid = 08:00Z-12:00Z: 240 min. Una reserva de 1 h.
    const pct = computeOccupancyPct(
      onlyMonday('10:00', '14:00'),
      WEEK,
      [{ startAt: at('2026-06-01T08:00:00Z'), endAt: at('2026-06-01T09:00:00Z') }],
      [],
    );
    expect(pct).toBe(25);
  });

  it('los bloqueos restan horas disponibles en vez de contar como ocupación', () => {
    // 4 h abiertas, 2 bloqueadas, 1 reservada → 50 %.
    const pct = computeOccupancyPct(
      onlyMonday('10:00', '14:00'),
      WEEK,
      [{ startAt: at('2026-06-01T08:00:00Z'), endAt: at('2026-06-01T09:00:00Z') }],
      [{ startAt: at('2026-06-01T10:00:00Z'), endAt: at('2026-06-01T12:00:00Z') }],
    );
    expect(pct).toBe(50);
  });

  it('bloqueos solapados no se descuentan dos veces', () => {
    const pct = computeOccupancyPct(
      onlyMonday('10:00', '14:00'),
      WEEK,
      [{ startAt: at('2026-06-01T08:00:00Z'), endAt: at('2026-06-01T09:00:00Z') }],
      [
        { startAt: at('2026-06-01T10:00:00Z'), endAt: at('2026-06-01T12:00:00Z') },
        { startAt: at('2026-06-01T11:00:00Z'), endAt: at('2026-06-01T12:00:00Z') },
      ],
    );
    expect(pct).toBe(50);
  });

  it('una reserva fuera del horario no cuenta', () => {
    const pct = computeOccupancyPct(
      onlyMonday('10:00', '14:00'),
      WEEK,
      [{ startAt: at('2026-06-01T16:00:00Z'), endAt: at('2026-06-01T17:00:00Z') }],
      [],
    );
    expect(pct).toBe(0);
  });

  it('sin horas disponibles (cerrado o todo bloqueado) devuelve 0', () => {
    const closed = onlyMonday('10:00', '14:00');
    closed.monday = [];
    expect(computeOccupancyPct(closed, WEEK, [], [])).toBe(0);
    expect(
      computeOccupancyPct(
        onlyMonday('10:00', '14:00'),
        WEEK,
        [],
        [{ startAt: at('2026-06-01T00:00:00Z'), endAt: at('2026-06-02T00:00:00Z') }],
      ),
    ).toBe(0);
  });
});
