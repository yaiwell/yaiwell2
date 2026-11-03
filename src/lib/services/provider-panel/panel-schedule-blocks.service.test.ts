import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Aquí no probamos la query (vive en el dominio `schedule-blocks`) sino
 * el troceo por día civil de Madrid: bloqueos que cruzan medianoche,
 * que ocupan varios días y que atraviesan un cambio de hora.
 */
vi.mock('server-only', () => ({}));
vi.mock('@/lib/services/schedule-blocks', () => ({
  scheduleBlocksRepository: { findForProviderRange: vi.fn(), findActiveProfessionals: vi.fn() },
}));

import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks';

import { getPanelWeekScheduleBlocks } from './panel-schedule-blocks.service';

const mockedFind = vi.mocked(scheduleBlocksRepository.findForProviderRange);
const mockedTeam = vi.mocked(scheduleBlocksRepository.findActiveProfessionals);

function record(
  startAt: string,
  endAt: string,
  reason: string | null = null,
  professionalId = 'pro-1',
  id = 'blk-1',
) {
  return {
    id,
    professionalId,
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    reason,
  };
}

describe('getPanelWeekScheduleBlocks', () => {
  beforeEach(() => {
    mockedFind.mockReset();
    mockedTeam.mockReset();
    mockedTeam.mockResolvedValue([
      { id: 'pro-1', name: 'Ana' },
      { id: 'pro-2', name: 'Luis' },
    ]);
  });

  it('consulta la semana de Madrid del lunes dado', async () => {
    mockedFind.mockResolvedValueOnce([]);
    await expect(getPanelWeekScheduleBlocks('prov-1', '2026-01-12')).resolves.toEqual([]);
    // Invierno (CET, UTC+1): lunes 00:00 Madrid = domingo 23:00 UTC.
    expect(mockedFind).toHaveBeenCalledWith(
      'prov-1',
      new Date('2026-01-11T23:00:00.000Z'),
      new Date('2026-01-18T23:00:00.000Z'),
    );
  });

  it('deja un bloqueo dentro de un día en un solo tramo con su hora de Madrid', async () => {
    mockedFind.mockResolvedValueOnce([
      record('2026-01-14T12:00:00.000Z', '2026-01-14T14:30:00.000Z', 'Médico'),
    ]);
    const [segment, ...rest] = await getPanelWeekScheduleBlocks('prov-1', '2026-01-12');
    expect(rest).toHaveLength(0);
    expect(segment).toEqual({
      id: 'blk-1',
      segmentKey: 'blk-1:2026-01-14',
      weekday: 2,
      startTime: '13:00',
      endTime: '15:30',
      reason: 'Médico',
      professionalId: 'pro-1',
      professionalName: 'Ana',
      startAtIso: '2026-01-14T12:00:00.000Z',
      endAtIso: '2026-01-14T14:30:00.000Z',
      isFullDay: false,
    });
  });

  it('trocea un bloqueo que cruza medianoche en dos tramos', async () => {
    // Miércoles 20:00 → jueves 09:00 en Madrid (invierno).
    mockedFind.mockResolvedValueOnce([
      record('2026-01-14T19:00:00.000Z', '2026-01-15T08:00:00.000Z'),
    ]);
    const segments = await getPanelWeekScheduleBlocks('prov-1', '2026-01-12');
    expect(segments.map((s) => [s.weekday, s.startTime, s.endTime, s.isFullDay])).toEqual([
      [2, '20:00', '24:00', false],
      [3, '00:00', '09:00', false],
    ]);
    expect(new Set(segments.map((s) => s.segmentKey)).size).toBe(2);
  });

  it('marca como día completo los días intermedios y recorta a la semana', async () => {
    // Sábado 10:00 de esta semana → martes 12:00 de la siguiente.
    mockedFind.mockResolvedValueOnce([
      record('2026-01-17T09:00:00.000Z', '2026-01-20T11:00:00.000Z'),
    ]);
    const segments = await getPanelWeekScheduleBlocks('prov-1', '2026-01-12');
    expect(segments.map((s) => [s.weekday, s.startTime, s.endTime, s.isFullDay])).toEqual([
      [5, '10:00', '24:00', false],
      [6, '00:00', '24:00', true],
    ]);
  });

  it('respeta el cambio de hora: el domingo de marzo dura 23 h y sigue siendo un día completo', async () => {
    // Semana del 23 al 29 de marzo de 2026; el domingo 29 se adelanta la hora.
    // Del sábado 28 a las 00:00 (CET) al lunes 30 a las 00:00 (CEST).
    mockedFind.mockResolvedValueOnce([
      record('2026-03-27T23:00:00.000Z', '2026-03-29T22:00:00.000Z'),
    ]);
    const segments = await getPanelWeekScheduleBlocks('prov-1', '2026-03-23');
    expect(segments.map((s) => [s.weekday, s.startTime, s.endTime, s.isFullDay])).toEqual([
      [5, '00:00', '24:00', true],
      [6, '00:00', '24:00', true],
    ]);
  });

  it('en la semana de octubre (25 h el domingo) la hora de Madrid no se desplaza', async () => {
    // Domingo 25 de octubre de 2026: a las 03:00 CEST vuelven a ser las 02:00 CET.
    // Bloqueo de 10:00 a 12:00 en Madrid ese domingo (ya en CET, UTC+1).
    mockedFind.mockResolvedValueOnce([
      record('2026-10-25T09:00:00.000Z', '2026-10-25T11:00:00.000Z'),
    ]);
    const segments = await getPanelWeekScheduleBlocks('prov-1', '2026-10-19');
    expect(segments.map((s) => [s.weekday, s.startTime, s.endTime])).toEqual([
      [6, '10:00', '12:00'],
    ]);
  });

  it('filtra por profesional y pone el nombre de cada uno', async () => {
    mockedFind.mockResolvedValue([
      record('2026-01-14T12:00:00.000Z', '2026-01-14T13:00:00.000Z', null, 'pro-1', 'blk-1'),
      record('2026-01-14T12:00:00.000Z', '2026-01-14T13:00:00.000Z', null, 'pro-2', 'blk-2'),
      // De alguien ya de baja: se pinta, sin nombre.
      record('2026-01-15T12:00:00.000Z', '2026-01-15T13:00:00.000Z', null, 'pro-old', 'blk-3'),
    ]);

    const all = await getPanelWeekScheduleBlocks('prov-1', '2026-01-12');
    expect(all.map((b) => [b.id, b.professionalId, b.professionalName])).toEqual([
      ['blk-1', 'pro-1', 'Ana'],
      ['blk-2', 'pro-2', 'Luis'],
      ['blk-3', 'pro-old', null],
    ]);

    const onlyLuis = await getPanelWeekScheduleBlocks('prov-1', '2026-01-12', 'pro-2');
    expect(onlyLuis.map((b) => b.id)).toEqual(['blk-2']);
  });

  it('con el filtro y sin bloqueos suyos no consulta el equipo', async () => {
    mockedFind.mockResolvedValueOnce([
      record('2026-01-14T12:00:00.000Z', '2026-01-14T13:00:00.000Z', null, 'pro-1'),
    ]);
    await expect(getPanelWeekScheduleBlocks('prov-1', '2026-01-12', 'pro-2')).resolves.toEqual([]);
    expect(mockedTeam).not.toHaveBeenCalled();
  });
});
