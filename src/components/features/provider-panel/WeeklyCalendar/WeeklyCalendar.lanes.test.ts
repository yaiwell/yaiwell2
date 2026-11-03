import { describe, expect, it } from 'vitest';

import { getLaneStyle, layoutOverlaps } from './WeeklyCalendar.lanes';
import { buildProfessionalFilterOptions } from './WeeklyCalendar.logic';

/** Franja en minutos desde medianoche a partir de `HH:mm`. */
function span(start: string, end: string) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return { start: toMin(start), end: toMin(end) };
}

describe('layoutOverlaps', () => {
  it('sin solapes, cada elemento ocupa todo el ancho', () => {
    expect(layoutOverlaps([span('09:00', '10:00'), span('11:00', '12:00')])).toEqual([
      { lane: 0, laneCount: 1 },
      { lane: 0, laneCount: 1 },
    ]);
  });

  it('dos que se solapan van en dos carriles', () => {
    expect(layoutOverlaps([span('10:00', '11:00'), span('10:30', '11:30')])).toEqual([
      { lane: 0, laneCount: 2 },
      { lane: 1, laneCount: 2 },
    ]);
  });

  it('tres a la vez van en tres carriles', () => {
    expect(
      layoutOverlaps([span('10:00', '11:00'), span('10:00', '10:45'), span('10:15', '12:00')]),
    ).toEqual([
      { lane: 0, laneCount: 3 },
      { lane: 1, laneCount: 3 },
      { lane: 2, laneCount: 3 },
    ]);
  });

  it('dos contiguas (una acaba cuando empieza la otra) no se solapan', () => {
    expect(layoutOverlaps([span('10:00', '11:00'), span('11:00', '12:00')])).toEqual([
      { lane: 0, laneCount: 1 },
      { lane: 0, laneCount: 1 },
    ]);
  });

  it('reutiliza el carril libre y todo el grupo en cadena comparte el número de carriles', () => {
    // A (10–12) pisa a B (10–11) y a C (11–12); B y C son contiguas, así
    // que C reutiliza el carril de B. D, más tarde, va sola.
    expect(
      layoutOverlaps([
        span('10:00', '12:00'),
        span('10:00', '11:00'),
        span('11:00', '12:00'),
        span('13:00', '14:00'),
      ]),
    ).toEqual([
      { lane: 0, laneCount: 2 },
      { lane: 1, laneCount: 2 },
      { lane: 1, laneCount: 2 },
      { lane: 0, laneCount: 1 },
    ]);
  });

  it('devuelve los carriles en el orden de entrada aunque lleguen desordenados', () => {
    expect(layoutOverlaps([span('10:30', '11:30'), span('10:00', '11:00')])).toEqual([
      { lane: 1, laneCount: 2 },
      { lane: 0, laneCount: 2 },
    ]);
  });

  it('a igual inicio respeta el orden de entrada', () => {
    expect(layoutOverlaps([span('10:00', '11:00'), span('10:00', '11:00')])).toEqual([
      { lane: 0, laneCount: 2 },
      { lane: 1, laneCount: 2 },
    ]);
  });

  it('lista vacía', () => {
    expect(layoutOverlaps([])).toEqual([]);
  });
});

describe('getLaneStyle', () => {
  it('con un carril deja mandar a la clase (ancho completo)', () => {
    expect(getLaneStyle(undefined)).toBeUndefined();
    expect(getLaneStyle({ lane: 0, laneCount: 1 })).toBeUndefined();
  });

  it('reparte el ancho entre los carriles', () => {
    expect(getLaneStyle({ lane: 1, laneCount: 2 })).toEqual({
      left: 'calc(50% + 2px)',
      right: 'calc(0% + 2px)',
    });
    expect(getLaneStyle({ lane: 0, laneCount: 4 })).toEqual({
      left: 'calc(0% + 2px)',
      right: 'calc(75% + 2px)',
    });
  });
});

describe('buildProfessionalFilterOptions', () => {
  const team = [
    { id: 'ana', name: 'Ana' },
    { id: 'luis', name: 'Luis' },
  ];

  it('pone «Todos» primero y lo marca activo sin profesional elegido', () => {
    expect(buildProfessionalFilterOptions(team, null, 'Todos')).toEqual([
      { id: null, name: 'Todos', active: true },
      { id: 'ana', name: 'Ana', active: false },
      { id: 'luis', name: 'Luis', active: false },
    ]);
  });

  it('marca activo solo al profesional elegido', () => {
    const options = buildProfessionalFilterOptions(team, 'luis', 'Todos');
    expect(options.filter((o) => o.active).map((o) => o.id)).toEqual(['luis']);
  });
});
