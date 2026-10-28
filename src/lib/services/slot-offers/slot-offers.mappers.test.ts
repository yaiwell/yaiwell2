import { describe, expect, it } from 'vitest';

import { withoutOccupied } from './slot-offers.mappers';

const at = (h: number) => new Date(`2026-10-28T${String(h).padStart(2, '0')}:00:00.000Z`);
const offer = { professionalId: 'pro-1', startAt: at(14), endAt: at(15) };

describe('withoutOccupied', () => {
  it('quita la oferta si una reserva activa del mismo profesional la pisa', () => {
    expect(
      withoutOccupied([offer], [{ professionalId: 'pro-1', startAt: at(14), endAt: at(15) }]),
    ).toEqual([]);
    // Una hora de la rejilla normal que se solapa también la «consume».
    expect(
      withoutOccupied(
        [offer],
        [
          {
            professionalId: 'pro-1',
            startAt: new Date('2026-10-28T13:30:00Z'),
            endAt: new Date('2026-10-28T14:30:00Z'),
          },
        ],
      ),
    ).toEqual([]);
  });

  it('ignora reservas de otro profesional o contiguas', () => {
    expect(
      withoutOccupied(
        [offer],
        [
          { professionalId: 'pro-2', startAt: at(14), endAt: at(15) },
          { professionalId: 'pro-1', startAt: at(15), endAt: at(16) },
        ],
      ),
    ).toEqual([offer]);
  });
});
