import { describe, expect, it } from 'vitest';

import { buildDayGrid } from './SearchDayPicker.logic';

describe('buildDayGrid', () => {
  // Viernes 6 de noviembre de 2026.
  const grid = buildDayGrid(new Date('2026-11-06T10:00:00Z'));
  const cells = grid.flat();

  it('pinta semanas completas de lunes a domingo', () => {
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(cells[0].day).toBe('2026-11-02');
  });

  it('solo ofrece hoy y los 27 días siguientes', () => {
    const offered = cells.filter((cell) => !cell.outOfRange);
    expect(offered).toHaveLength(28);
    expect(offered[0].day).toBe('2026-11-06');
    expect(offered[27].day).toBe('2026-12-03');
  });

  it('escribe el mes en el primer día ofrecido y al cambiar de mes', () => {
    expect(cells.filter((cell) => cell.showMonth).map((cell) => cell.day)).toEqual([
      '2026-11-06',
      '2026-12-01',
    ]);
  });

  it('usa el día de Madrid, no el del dispositivo', () => {
    // 23:30 UTC del 6 ya es día 7 en Madrid.
    const offered = buildDayGrid(new Date('2026-11-06T23:30:00Z')).flat();
    expect(offered.find((cell) => !cell.outOfRange)?.day).toBe('2026-11-07');
  });
});
