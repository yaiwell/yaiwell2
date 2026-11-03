/**
 * Orden de asignación de «cualquiera disponible» (CLAUDE.md §4.bis
 * «Equipo»): oferta en esa hora, luego menos reservas ese día, luego el
 * más antiguo.
 */
import { describe, expect, it } from 'vitest';

import { pickCandidates, type BookingCandidate } from './booking.candidates';

function candidate(
  overrides: Partial<BookingCandidate> & { professionalId: string },
): BookingCandidate {
  return {
    offerDiscountPct: null,
    dayBookings: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('pickCandidates', () => {
  it('primero quien tiene la hora con descuento, aunque tenga más reservas', () => {
    expect(
      pickCandidates([
        candidate({ professionalId: 'a', dayBookings: 0 }),
        candidate({ professionalId: 'b', dayBookings: 5, offerDiscountPct: 10 }),
      ]),
    ).toEqual(['b', 'a']);
  });

  it('entre varias ofertas, la de mayor descuento (la que se anuncia)', () => {
    expect(
      pickCandidates([
        candidate({ professionalId: 'a', offerDiscountPct: 10 }),
        candidate({ professionalId: 'b', offerDiscountPct: 30 }),
      ]),
    ).toEqual(['b', 'a']);
  });

  it('sin ofertas, quien tiene menos reservas ese día', () => {
    expect(
      pickCandidates([
        candidate({ professionalId: 'a', dayBookings: 3 }),
        candidate({ professionalId: 'b', dayBookings: 1 }),
        candidate({ professionalId: 'c', dayBookings: 2 }),
      ]),
    ).toEqual(['b', 'c', 'a']);
  });

  it('a igualdad, el más antiguo y, si coinciden, por id', () => {
    expect(
      pickCandidates([
        candidate({ professionalId: 'z', createdAt: new Date('2026-03-01') }),
        candidate({ professionalId: 'y', createdAt: new Date('2026-02-01') }),
        candidate({ professionalId: 'x', createdAt: new Date('2026-03-01') }),
      ]),
    ).toEqual(['y', 'x', 'z']);
  });

  it('no muta la lista recibida', () => {
    const input = [
      candidate({ professionalId: 'a', dayBookings: 2 }),
      candidate({ professionalId: 'b' }),
    ];
    pickCandidates(input);
    expect(input.map((c) => c.professionalId)).toEqual(['a', 'b']);
  });
});
