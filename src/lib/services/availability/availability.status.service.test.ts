import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WeeklySchedule } from './availability.types';

/**
 * Mock del singleton Prisma, mismo patrón que `availability.service.test`.
 *
 * Aquí interceptamos `$queryRaw` (horarios en batch) y
 * `booking.findMany` (reservas en batch) para poder CONTAR consultas:
 * el objetivo de este módulo es que el número de viajes a BD no crezca
 * con el número de proveedores.
 */
vi.mock('@/lib/db/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      booking: {
        findMany: vi.fn(),
      },
    },
  };
});

import { prisma } from '@/lib/db/prisma';

import { getProvidersAvailability } from './availability.status.service';

const mockedQueryRaw = vi.mocked(prisma.$queryRaw);
const mockedBookingFindMany = vi.mocked(prisma.booking.findMany);

const OPEN_EVERY_DAY: WeeklySchedule = {
  monday: [{ open: '10:00', close: '20:00' }],
  tuesday: [{ open: '10:00', close: '20:00' }],
  wednesday: [{ open: '10:00', close: '20:00' }],
  thursday: [{ open: '10:00', close: '20:00' }],
  friday: [{ open: '10:00', close: '20:00' }],
  saturday: [{ open: '10:00', close: '20:00' }],
  sunday: [{ open: '10:00', close: '20:00' }],
};

/** 09:50 hora de Madrid (CEST) del 27 de julio de 2026. */
const NOW = new Date('2026-07-27T07:50:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getProvidersAvailability', () => {
  it('no toca la BD cuando no hay proveedores', async () => {
    const result = await getProvidersAvailability([], NOW);

    expect(result.size).toBe(0);
    expect(mockedQueryRaw).not.toHaveBeenCalled();
    expect(mockedBookingFindMany).not.toHaveBeenCalled();
  });

  it('usa exactamente 2 consultas para 3 proveedores con 2 profesionales cada uno', async () => {
    const providerIds = ['prov-1', 'prov-2', 'prov-3'];
    const bundles = providerIds.flatMap((providerId) =>
      ['a', 'b'].map((suffix) => ({
        professionalId: `${providerId}-${suffix}`,
        providerId,
        schedule: OPEN_EVERY_DAY,
        bufferMinutes: 0,
        minServiceDurationMinutes: 60,
      })),
    );

    mockedQueryRaw.mockResolvedValueOnce(bundles);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    const result = await getProvidersAvailability(providerIds, NOW);

    // El corazón de esta tarea: 6 profesionales, 2 consultas. Si alguien
    // reintroduce la cascada N×M, este test lo caza.
    expect(mockedQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockedBookingFindMany).toHaveBeenCalledTimes(1);

    expect(result.size).toBe(3);
    for (const providerId of providerIds) {
      expect(result.get(providerId)?.status).toBe('available_now');
    }
  });

  it('devuelve busy para los proveedores sin datos en BD', async () => {
    mockedQueryRaw.mockResolvedValueOnce([]);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    const result = await getProvidersAvailability(['sin-profesionales'], NOW);

    expect(result.get('sin-profesionales')).toEqual({ status: 'busy', nextSlot: null });
  });

  it('registra en el log el horario corrupto y degrada a busy sin lanzar', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockedQueryRaw.mockResolvedValueOnce([
      {
        professionalId: 'prof-roto',
        providerId: 'prov-roto',
        schedule: { monday: [] },
        bufferMinutes: 0,
        minServiceDurationMinutes: 60,
      },
    ]);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    const result = await getProvidersAvailability(['prov-roto'], NOW);

    expect(result.get('prov-roto')).toEqual({ status: 'busy', nextSlot: null });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('descuenta las reservas activas al calcular el estado', async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        professionalId: 'prof-1',
        providerId: 'prov-1',
        schedule: OPEN_EVERY_DAY,
        bufferMinutes: 0,
        minServiceDurationMinutes: 60,
      },
    ]);
    // Ocupado de 10:00 a 18:00 Madrid. El cast replica el patrón de
    // `availability.service.test`: el select real devuelve un subconjunto
    // de columnas que el tipo generado por Prisma no refleja.
    mockedBookingFindMany.mockResolvedValueOnce([
      {
        professionalId: 'prof-1',
        startAt: new Date('2026-07-27T08:00:00.000Z'),
        endAt: new Date('2026-07-27T16:00:00.000Z'),
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.booking.findMany>>);

    const result = await getProvidersAvailability(['prov-1'], NOW);

    expect(result.get('prov-1')?.status).toBe('busy');
    // Sigue habiendo hueco más tarde: 18:00 Madrid = 16:00Z.
    expect(result.get('prov-1')?.nextSlot?.startAt.toISOString()).toBe('2026-07-27T16:00:00.000Z');
  });
});
