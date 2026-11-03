/**
 * Bloqueos de agenda en el motor de disponibilidad.
 *
 * Un bloqueo activo ocupa igual que una reserva: quita huecos en
 * `getAvailableSlots` (también si empezó la noche anterior y cubre la
 * madrugada de Madrid) y hace que `isSlotAvailable` devuelva `false`.
 *
 * El `findMany` de bloqueos falso filtra por el rango que recibe: así
 * el test caza si el servicio pide un rango demasiado estrecho.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WeeklySchedule } from './availability.types';

type Span = { startAt: Date; endAt: Date };

const { blocks, professionalFindFirst, bookingFindMany } = vi.hoisted(() => ({
  blocks: { rows: [] as { startAt: Date; endAt: Date }[] },
  professionalFindFirst: vi.fn(),
  bookingFindMany: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    professional: { findFirst: professionalFindFirst },
    booking: { findMany: bookingFindMany },
    scheduleBlock: {
      findMany: vi.fn(async (args: { where: { startAt: { lt: Date }; endAt: { gt: Date } } }) =>
        blocks.rows.filter(
          (b) => b.startAt < args.where.startAt.lt && b.endAt > args.where.endAt.gt,
        ),
      ),
    },
  },
}));

import { getAvailableSlots, isSlotAvailable } from './availability.service';

const PROFESSIONAL_ID = '11111111-1111-4111-8111-111111111111';
const MONDAY = new Date('2026-06-01T00:00:00.000Z');
const SUNDAY_NOON = new Date('2026-05-31T12:00:00.000Z');

function scheduleWithMonday(open: string, close: string): WeeklySchedule {
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

function isoStarts(slots: Span[]): string[] {
  return slots.map((s) => s.startAt.toISOString());
}

beforeEach(() => {
  vi.clearAllMocks();
  blocks.rows = [];
  bookingFindMany.mockResolvedValue([]);
});

describe('getAvailableSlots con bloqueos de agenda', () => {
  it('un bloqueo elimina los huecos que pisa', async () => {
    professionalFindFirst.mockResolvedValue({
      schedule: scheduleWithMonday('10:00', '13:00'),
      bufferMinutes: 0,
    });
    // 11:00-12:00 Madrid (CEST) = 09:00Z-10:00Z.
    blocks.rows = [
      {
        startAt: new Date('2026-06-01T09:00:00.000Z'),
        endAt: new Date('2026-06-01T10:00:00.000Z'),
      },
    ];

    const slots = await getAvailableSlots(
      { professionalId: PROFESSIONAL_ID, date: MONDAY, serviceDurationMinutes: 60 },
      SUNDAY_NOON,
    );

    expect(isoStarts(slots)).toEqual(['2026-06-01T08:00:00.000Z', '2026-06-01T10:00:00.000Z']);
  });

  it('un bloqueo que cruza la medianoche quita la madrugada de Madrid', async () => {
    professionalFindFirst.mockResolvedValue({
      schedule: scheduleWithMonday('00:00', '02:00'),
      bufferMinutes: 0,
    });
    // Domingo 22:00 → lunes 01:00 Madrid = domingo 20:00Z → 23:00Z. Todo
    // cae ANTES del día UTC del lunes: sin margen no se vería.
    blocks.rows = [
      {
        startAt: new Date('2026-05-31T20:00:00.000Z'),
        endAt: new Date('2026-05-31T23:00:00.000Z'),
      },
    ];

    const slots = await getAvailableSlots(
      { professionalId: PROFESSIONAL_ID, date: MONDAY, serviceDurationMinutes: 30 },
      SUNDAY_NOON,
    );

    // Quedan 01:00 y 01:30 Madrid (23:00Z y 23:30Z del domingo).
    expect(isoStarts(slots)).toEqual(['2026-05-31T23:00:00.000Z', '2026-05-31T23:30:00.000Z']);
  });

  it('una reserva de madrugada de Madrid ocupa su hora (cae en el día UTC anterior)', async () => {
    professionalFindFirst.mockResolvedValue({
      schedule: scheduleWithMonday('00:00', '02:00'),
      bufferMinutes: 0,
    });
    // Lunes 00:00-01:00 Madrid = domingo 22:00Z-23:00Z. Antes las reservas
    // se pedían solo dentro del día UTC del lunes y esta no se veía.
    const booking = {
      startAt: new Date('2026-05-31T22:00:00.000Z'),
      endAt: new Date('2026-05-31T23:00:00.000Z'),
    };
    bookingFindMany.mockImplementation(
      async (args: { where: { startAt: { lt: Date }; endAt: { gt: Date } } }) =>
        [booking].filter((b) => b.startAt < args.where.startAt.lt && b.endAt > args.where.endAt.gt),
    );

    const slots = await getAvailableSlots(
      { professionalId: PROFESSIONAL_ID, date: MONDAY, serviceDurationMinutes: 30 },
      SUNDAY_NOON,
    );

    expect(isoStarts(slots)).toEqual(['2026-05-31T23:00:00.000Z', '2026-05-31T23:30:00.000Z']);
  });

  it('un bloqueo quitado (no devuelto por la query) no ocupa', async () => {
    professionalFindFirst.mockResolvedValue({
      schedule: scheduleWithMonday('10:00', '12:00'),
      bufferMinutes: 0,
    });

    const slots = await getAvailableSlots(
      { professionalId: PROFESSIONAL_ID, date: MONDAY, serviceDurationMinutes: 60 },
      SUNDAY_NOON,
    );

    expect(slots).toHaveLength(2);
  });
});

describe('isSlotAvailable con bloqueos de agenda', () => {
  beforeEach(() => {
    professionalFindFirst.mockResolvedValue({
      schedule: scheduleWithMonday('10:00', '13:00'),
      bufferMinutes: 0,
    });
  });

  it('devuelve false si un bloqueo pisa el hueco', async () => {
    blocks.rows = [
      {
        startAt: new Date('2026-06-01T08:30:00.000Z'),
        endAt: new Date('2026-06-01T09:30:00.000Z'),
      },
    ];

    await expect(
      isSlotAvailable(PROFESSIONAL_ID, new Date('2026-06-01T08:00:00.000Z'), 60),
    ).resolves.toBe(false);
  });

  it('un bloqueo pegado al final del hueco no lo ocupa', async () => {
    blocks.rows = [
      {
        startAt: new Date('2026-06-01T09:00:00.000Z'),
        endAt: new Date('2026-06-01T10:00:00.000Z'),
      },
    ];

    await expect(
      isSlotAvailable(PROFESSIONAL_ID, new Date('2026-06-01T08:00:00.000Z'), 60),
    ).resolves.toBe(true);
  });
});
