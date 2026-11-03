/**
 * Rejilla de un servicio con varios profesionales (CLAUDE.md §4.bis
 * «Equipo»): unión por hora de inicio («cualquiera»), candidatos libres
 * de cada hora, filtro por profesional y carga en lote sin N+1.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./availability.repository', () => ({
  availabilityRepository: {
    findServiceForAvailability: vi.fn(),
    findProfessionalSchedules: vi.fn(),
    findBookingsForProviders: vi.fn(),
    findScheduleBlocksForProviders: vi.fn(),
  },
}));

import {
  InvalidScheduleError,
  ProfessionalNotForServiceError,
  ServiceForAvailabilityNotFoundError,
} from './availability.errors';
import { availabilityRepository } from './availability.repository';
import { getServiceDaySlots } from './availability.service-day';
import type { WeeklySchedule } from './availability.types';

const repo = vi.mocked(availabilityRepository);

/** Lunes 1 de junio de 2026. Madrid en CEST: 10:00 local = 08:00Z. */
const MONDAY = new Date(Date.UTC(2026, 5, 1));
const NOW = new Date('2026-05-31T12:00:00.000Z');
const iso = (h: number) => new Date(Date.UTC(2026, 5, 1, h)).toISOString();

function mondays(open: string, close: string): WeeklySchedule {
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

beforeEach(() => {
  vi.resetAllMocks();
  repo.findServiceForAvailability.mockResolvedValue({
    id: 'svc-1',
    providerId: 'prov-1',
    durationMinutes: 60,
    professionalIds: ['pro-a', 'pro-b'],
  });
  // Ana 10-12 Madrid (08-10Z), Bea 11-13 Madrid (09-11Z).
  repo.findProfessionalSchedules.mockResolvedValue([
    { id: 'pro-a', schedule: mondays('10:00', '12:00'), bufferMinutes: 0 },
    { id: 'pro-b', schedule: mondays('11:00', '13:00'), bufferMinutes: 0 },
  ]);
  repo.findBookingsForProviders.mockResolvedValue([]);
  repo.findScheduleBlocksForProviders.mockResolvedValue([]);
});

describe('getServiceDaySlots', () => {
  it('«cualquiera»: une las horas de todos y guarda quién está libre en cada una', async () => {
    const result = await getServiceDaySlots('svc-1', MONDAY, NOW);

    expect(result.slots.map((s) => s.startAt.toISOString())).toEqual([iso(8), iso(9), iso(10)]);
    expect(result.candidatesByStart.get(Date.parse(iso(8)))).toEqual(['pro-a']);
    expect(result.candidatesByStart.get(Date.parse(iso(9)))).toEqual(['pro-a', 'pro-b']);
    expect(result.candidatesByStart.get(Date.parse(iso(10)))).toEqual(['pro-b']);
    expect(result.professionalIds).toEqual(['pro-a', 'pro-b']);
  });

  it('carga en lote: una consulta por tipo y por negocio, sea cual sea el equipo', async () => {
    await getServiceDaySlots('svc-1', MONDAY, NOW);

    expect(repo.findProfessionalSchedules).toHaveBeenCalledOnce();
    expect(repo.findProfessionalSchedules).toHaveBeenCalledWith(['pro-a', 'pro-b']);
    expect(repo.findBookingsForProviders).toHaveBeenCalledOnce();
    expect(repo.findBookingsForProviders.mock.calls[0][0]).toEqual(['prov-1']);
    expect(repo.findScheduleBlocksForProviders).toHaveBeenCalledOnce();
  });

  it('las reservas y bloqueos de uno no quitan la hora al otro', async () => {
    repo.findBookingsForProviders.mockResolvedValue([
      { professionalId: 'pro-a', startAt: new Date(iso(9)), endAt: new Date(iso(10)) },
    ]);
    repo.findScheduleBlocksForProviders.mockResolvedValue([
      { professionalId: 'pro-b', startAt: new Date(iso(10)), endAt: new Date(iso(11)) },
    ]);

    const result = await getServiceDaySlots('svc-1', MONDAY, NOW);

    expect(result.slots.map((s) => s.startAt.toISOString())).toEqual([iso(8), iso(9)]);
    expect(result.candidatesByStart.get(Date.parse(iso(9)))).toEqual(['pro-b']);
  });

  it('con professionalId: solo los huecos de ese profesional', async () => {
    repo.findProfessionalSchedules.mockResolvedValue([
      { id: 'pro-b', schedule: mondays('11:00', '13:00'), bufferMinutes: 0 },
    ]);

    const result = await getServiceDaySlots('svc-1', MONDAY, NOW, 'pro-b');

    expect(repo.findProfessionalSchedules).toHaveBeenCalledWith(['pro-b']);
    expect(result.slots.map((s) => s.startAt.toISOString())).toEqual([iso(9), iso(10)]);
    expect(result.professionalIds).toEqual(['pro-b']);
  });

  it('un profesional que no presta el servicio es ProfessionalNotForServiceError', async () => {
    await expect(getServiceDaySlots('svc-1', MONDAY, NOW, 'pro-x')).rejects.toBeInstanceOf(
      ProfessionalNotForServiceError,
    );
  });

  it('servicio inexistente o sin nadie que lo preste', async () => {
    repo.findServiceForAvailability.mockResolvedValueOnce(null);
    await expect(getServiceDaySlots('svc-1', MONDAY, NOW)).rejects.toBeInstanceOf(
      ServiceForAvailabilityNotFoundError,
    );
    repo.findServiceForAvailability.mockResolvedValueOnce({
      id: 'svc-1',
      providerId: 'prov-1',
      durationMinutes: 60,
      professionalIds: [],
    });
    await expect(getServiceDaySlots('svc-1', MONDAY, NOW)).rejects.toBeInstanceOf(
      ServiceForAvailabilityNotFoundError,
    );
  });

  it('«cualquiera»: un horario corrupto se omite; con professionalId se lanza', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    repo.findProfessionalSchedules.mockResolvedValue([
      { id: 'pro-a', schedule: { roto: true }, bufferMinutes: 0 },
      { id: 'pro-b', schedule: mondays('11:00', '13:00'), bufferMinutes: 0 },
    ]);
    const result = await getServiceDaySlots('svc-1', MONDAY, NOW);
    expect(result.slots.map((s) => s.startAt.toISOString())).toEqual([iso(9), iso(10)]);

    repo.findProfessionalSchedules.mockResolvedValue([
      { id: 'pro-a', schedule: { roto: true }, bufferMinutes: 0 },
    ]);
    await expect(getServiceDaySlots('svc-1', MONDAY, NOW, 'pro-a')).rejects.toBeInstanceOf(
      InvalidScheduleError,
    );
    // En «cualquiera» con todo el equipo roto también se lanza.
    await expect(getServiceDaySlots('svc-1', MONDAY, NOW)).rejects.toBeInstanceOf(
      InvalidScheduleError,
    );
    spy.mockRestore();
  });
});
