import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvalidScheduleError, ProfessionalNotFoundError } from './availability.errors';
import { getAvailableSlots, isSlotAvailable } from './availability.service';
import type { WeeklySchedule } from './availability.types';

/**
 * Mock del singleton Prisma.
 *
 * Sustituimos `prisma.professional.findFirst` y `prisma.booking.findMany`
 * por funciones controladas desde cada test. Es el mismo patrón que el
 * resto de servicios del repo seguirán cuando migren de fake-data a BD.
 */
vi.mock('@/lib/db/prisma', () => {
  return {
    prisma: {
      professional: {
        findFirst: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
      },
    },
  };
});

// Importamos el cliente mockeado para programar respuestas en cada test.
import { prisma } from '@/lib/db/prisma';

const mockedProfessionalFindFirst = vi.mocked(prisma.professional.findFirst);
const mockedBookingFindMany = vi.mocked(prisma.booking.findMany);

/**
 * Horario base lunes-viernes 10:00-20:00, fin de semana cerrado.
 * Punto de partida para la mayoría de tests.
 */
const weekdaySchedule: WeeklySchedule = {
  monday: [{ open: '10:00', close: '20:00' }],
  tuesday: [{ open: '10:00', close: '20:00' }],
  wednesday: [{ open: '10:00', close: '20:00' }],
  thursday: [{ open: '10:00', close: '20:00' }],
  friday: [{ open: '10:00', close: '20:00' }],
  saturday: [],
  sunday: [],
};

/**
 * UUID válido reutilizable por todos los tests. El Zod schema lo exige.
 */
const PROFESSIONAL_ID = '11111111-1111-4111-8111-111111111111';

/**
 * Un lunes en UTC, lejos de cambios de hora y sin ambigüedad de TZ.
 * 2026-06-01 cae en lunes y todos los tests parten de ahí.
 */
const MONDAY_UTC = new Date(Date.UTC(2026, 5, 1, 0, 0, 0, 0));

/**
 * Resetea los mocks entre tests para evitar fugas de estado.
 *
 * Usamos `resetAllMocks` (no `clearAllMocks`) porque también vacía la
 * cola de `mockResolvedValueOnce`, evitando que respuestas no
 * consumidas en un test contaminen el siguiente.
 */
beforeEach(() => {
  vi.resetAllMocks();
});

describe('getAvailableSlots', () => {
  it('genera slots cada 75 min (60 + 15 buffer) en jornada continua sin reservas', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      schedule: weekdaySchedule,
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    const slots = await getAvailableSlots({
      professionalId: PROFESSIONAL_ID,
      date: MONDAY_UTC,
      serviceDurationMinutes: 60,
    });

    // Bloque 10:00-20:00 = 600 minutos. Paso = 75 (60 servicio + 15 buffer).
    // Inicios válidos: 10:00, 11:15, 12:30, 13:45, 15:00, 16:15, 17:30, 18:45.
    // 18:45 + 60 = 19:45 ≤ 20:00 → cabe. Siguiente sería 20:00 → fuera.
    const startsHHmm = slots.map((s) => s.startAt.toISOString().slice(11, 16));
    expect(startsHHmm).toEqual([
      '10:00',
      '11:15',
      '12:30',
      '13:45',
      '15:00',
      '16:15',
      '17:30',
      '18:45',
    ]);
  });

  it('excluye slots que solapan con una reserva activa existente', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      schedule: weekdaySchedule,
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    // Reserva ocupada de 14:00 a 15:00 UTC.
    mockedBookingFindMany.mockResolvedValueOnce([
      {
        startAt: new Date(Date.UTC(2026, 5, 1, 14, 0, 0, 0)),
        endAt: new Date(Date.UTC(2026, 5, 1, 15, 0, 0, 0)),
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.booking.findMany>>);

    const slots = await getAvailableSlots({
      professionalId: PROFESSIONAL_ID,
      date: MONDAY_UTC,
      serviceDurationMinutes: 60,
    });

    const startsHHmm = slots.map((s) => s.startAt.toISOString().slice(11, 16));
    // El slot candidato a 13:45 termina a 14:45 → solapa con [14:00, 15:00).
    // También 14:30 (si existiera por otro paso) quedaría fuera.
    expect(startsHHmm).not.toContain('13:45');
    expect(startsHHmm).not.toContain('14:30');
    // El siguiente slot del patrón base (15:00) no solapa: empieza en el
    // límite cerrado del intervalo y el overlap es estricto.
    expect(startsHHmm).toContain('15:00');
  });

  it('respeta jornadas partidas (mañana + tarde) sin generar slots en la pausa', async () => {
    const splitSchedule: WeeklySchedule = {
      ...weekdaySchedule,
      monday: [
        { open: '10:00', close: '14:00' },
        { open: '17:00', close: '20:00' },
      ],
    };
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      schedule: splitSchedule,
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    const slots = await getAvailableSlots({
      professionalId: PROFESSIONAL_ID,
      date: MONDAY_UTC,
      serviceDurationMinutes: 60,
    });

    const startsHHmm = slots.map((s) => s.startAt.toISOString().slice(11, 16));
    // Ningún slot debe empezar entre 14:00 (inclusive) y 17:00 (exclusivo).
    for (const hhmm of startsHHmm) {
      const [hh, mm] = hhmm.split(':').map(Number);
      const minutes = hh * 60 + mm;
      const inBreak = minutes >= 14 * 60 && minutes < 17 * 60;
      expect(inBreak).toBe(false);
    }
    // Y debemos tener al menos un slot por la mañana y otro por la tarde.
    expect(startsHHmm).toContain('10:00');
    expect(startsHHmm).toContain('17:00');
  });

  it('devuelve lista vacía cuando el weekday del horario está vacío', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      schedule: weekdaySchedule,
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    // 2026-06-06 cae en sábado, día cerrado en el horario base.
    const saturday = new Date(Date.UTC(2026, 5, 6, 0, 0, 0, 0));
    const slots = await getAvailableSlots({
      professionalId: PROFESSIONAL_ID,
      date: saturday,
      serviceDurationMinutes: 60,
    });

    expect(slots).toEqual([]);
  });

  it('devuelve lista vacía para un bloque demasiado corto para el servicio', async () => {
    const tightSchedule: WeeklySchedule = {
      ...weekdaySchedule,
      // Único bloque del lunes: 50 minutos. Un servicio de 60 no cabe.
      monday: [{ open: '10:00', close: '10:50' }],
    };
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      schedule: tightSchedule,
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    const slots = await getAvailableSlots({
      professionalId: PROFESSIONAL_ID,
      date: MONDAY_UTC,
      serviceDurationMinutes: 60,
    });

    expect(slots).toEqual([]);
  });

  it('lanza ProfessionalNotFoundError si el profesional no existe', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce(null);

    await expect(
      getAvailableSlots({
        professionalId: PROFESSIONAL_ID,
        date: MONDAY_UTC,
        serviceDurationMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);
  });

  it('lanza InvalidScheduleError si el JSON del horario no parsea', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      // Falta el día "sunday" — el schema lo exige.
      schedule: {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
      },
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    await expect(
      getAvailableSlots({
        professionalId: PROFESSIONAL_ID,
        date: MONDAY_UTC,
        serviceDurationMinutes: 60,
      }),
    ).rejects.toBeInstanceOf(InvalidScheduleError);
  });
});

describe('isSlotAvailable', () => {
  it('devuelve true cuando no hay reservas que solapen', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      schedule: weekdaySchedule,
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    mockedBookingFindMany.mockResolvedValueOnce([]);

    const result = await isSlotAvailable(
      PROFESSIONAL_ID,
      new Date(Date.UTC(2026, 5, 1, 12, 0, 0, 0)),
      60,
    );

    expect(result).toBe(true);
  });

  it('devuelve false cuando una reserva activa solapa con el slot', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce({
      schedule: weekdaySchedule,
      bufferMinutes: 15,
    } as unknown as Awaited<ReturnType<typeof prisma.professional.findFirst>>);
    mockedBookingFindMany.mockResolvedValueOnce([
      {
        startAt: new Date(Date.UTC(2026, 5, 1, 12, 30, 0, 0)),
        endAt: new Date(Date.UTC(2026, 5, 1, 13, 30, 0, 0)),
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.booking.findMany>>);

    const result = await isSlotAvailable(
      PROFESSIONAL_ID,
      new Date(Date.UTC(2026, 5, 1, 12, 0, 0, 0)),
      60,
    );

    expect(result).toBe(false);
  });

  it('lanza ProfessionalNotFoundError si el profesional no existe', async () => {
    mockedProfessionalFindFirst.mockResolvedValueOnce(null);

    await expect(
      isSlotAvailable(PROFESSIONAL_ID, new Date(Date.UTC(2026, 5, 1, 12, 0, 0, 0)), 60),
    ).rejects.toBeInstanceOf(ProfessionalNotFoundError);
  });
});
