import { describe, expect, it } from 'vitest';

import { groupSlots } from './SlotPicker.groups';

/**
 * Tests del reparto de huecos del selector: los de última hora (< 2 h)
 * van en su propio grupo y no se repiten en mañana/tarde.
 */

/** 09:00 Madrid (CEST) del 5 de octubre de 2026. */
const NOW = new Date('2026-10-05T07:00:00.000Z');

function slot(startAtIso: string) {
  return { startAtIso, endAtIso: startAtIso, available: true };
}

describe('groupSlots', () => {
  it('separa los huecos a menos de 2 h del resto', () => {
    const groups = groupSlots(
      [
        slot('2026-10-05T07:30:00.000Z'), // 09:30 Madrid, a 30 min
        slot('2026-10-05T08:59:00.000Z'), // a 1 h 59 min
        slot('2026-10-05T09:00:00.000Z'), // a 2 h justas: ya no
        slot('2026-10-05T13:00:00.000Z'), // 15:00 Madrid, tarde
      ],
      NOW,
    );

    expect(groups.lastMinute.map((s) => s.startAtIso)).toEqual([
      '2026-10-05T07:30:00.000Z',
      '2026-10-05T08:59:00.000Z',
    ]);
    expect(groups.morning.map((s) => s.startAtIso)).toEqual(['2026-10-05T09:00:00.000Z']);
    expect(groups.afternoon.map((s) => s.startAtIso)).toEqual(['2026-10-05T13:00:00.000Z']);
  });

  it('deja el grupo de última hora vacío para un día lejano', () => {
    const groups = groupSlots([slot('2026-10-09T08:00:00.000Z')], NOW);
    expect(groups.lastMinute).toEqual([]);
    expect(groups.morning).toHaveLength(1);
  });
});

describe('groupSlots — huecos liberados fuera de la rejilla', () => {
  it('coloca un hueco liberado a una hora suelta en su franja y en orden', () => {
    // La API devuelve los huecos ordenados por inicio, también los que
    // caen fuera de la rejilla normal (p. ej. 13:45 tras una cancelación).
    const offer = { discountPct: 20, priceCents: 3600, originalPriceCents: 4500 };
    const groups = groupSlots(
      [
        slot('2026-10-09T09:00:00.000Z'), // 11:00 Madrid
        { ...slot('2026-10-09T11:45:00.000Z'), offer }, // 13:45, fuera de rejilla
        slot('2026-10-09T12:00:00.000Z'), // 14:00
        { ...slot('2026-10-09T12:10:00.000Z'), offer }, // 14:10, fuera de rejilla
      ],
      NOW,
    );

    expect(groups.morning.map((s) => s.startAtIso)).toEqual([
      '2026-10-09T09:00:00.000Z',
      '2026-10-09T11:45:00.000Z',
    ]);
    expect(groups.afternoon.map((s) => s.startAtIso)).toEqual([
      '2026-10-09T12:00:00.000Z',
      '2026-10-09T12:10:00.000Z',
    ]);
    expect(groups.morning[1].offer?.discountPct).toBe(20);
  });
});
