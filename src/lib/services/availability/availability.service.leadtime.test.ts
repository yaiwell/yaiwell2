import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAvailableSlots, getSlotsForService } from './availability.service';
import type { WeeklySchedule } from './availability.types';

/**
 * Tests de coherencia entre el selector de huecos y la validación de
 * reserva: el motor no puede ofrecer un hueco que empiece antes de
 * `now + MIN_BOOKING_LEAD_TIME_MS` (30 min), porque `createBooking` lo
 * rechazaría al pagar.
 *
 * Mockeamos el repositorio entero (no Prisma) porque aquí solo interesa
 * el corte por antelación, no las queries.
 */
vi.mock('./availability.repository', () => ({
  availabilityRepository: {
    findProfessionalSchedule: vi.fn(),
    findBookingsForDay: vi.fn(),
    findServiceForAvailability: vi.fn(),
    findFirstProfessionalIdForProvider: vi.fn(),
  },
}));

import { availabilityRepository } from './availability.repository';

const repo = vi.mocked(availabilityRepository);

const PROFESSIONAL_ID = '11111111-1111-4111-8111-111111111111';
const SERVICE_ID = '22222222-2222-4222-8222-222222222222';

const OPEN_MONDAY: WeeklySchedule = {
  monday: [{ open: '10:00', close: '13:00' }],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

/** Lunes 1 de junio de 2026. Madrid en CEST: 10:00 local = 08:00Z. */
const MONDAY_UTC = new Date(Date.UTC(2026, 5, 1, 0, 0, 0, 0));

/** Slots de 60 min sin buffer: 08:00Z, 09:00Z, 10:00Z (10, 11 y 12 h Madrid). */
async function slotsAt(nowIso: string): Promise<string[]> {
  const slots = await getAvailableSlots(
    { professionalId: PROFESSIONAL_ID, date: MONDAY_UTC, serviceDurationMinutes: 60 },
    new Date(nowIso),
  );
  return slots.map((slot) => slot.startAt.toISOString());
}

beforeEach(() => {
  vi.resetAllMocks();
  repo.findProfessionalSchedule.mockResolvedValue({ schedule: OPEN_MONDAY, bufferMinutes: 0 });
  repo.findBookingsForDay.mockResolvedValue([]);
});

describe('getAvailableSlots — antelación mínima de 30 min', () => {
  it('no devuelve huecos que empiezan a menos de 30 minutos', async () => {
    // 07:45Z: el slot de 08:00Z está a 15 min.
    expect(await slotsAt('2026-06-01T07:45:00.000Z')).toEqual([
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T10:00:00.000Z',
    ]);
  });

  it('devuelve el hueco que empieza justo a 30:00', async () => {
    expect(await slotsAt('2026-06-01T07:30:00.000Z')).toContain('2026-06-01T08:00:00.000Z');
  });

  it('descarta el hueco que empieza a 29:59', async () => {
    expect(await slotsAt('2026-06-01T07:30:01.000Z')).not.toContain('2026-06-01T08:00:00.000Z');
  });

  it('devuelve todo el día cuando aún falta mucho', async () => {
    expect(await slotsAt('2026-05-31T12:00:00.000Z')).toHaveLength(3);
  });
});

describe('getSlotsForService — antelación mínima', () => {
  it('propaga el now inyectado al motor', async () => {
    repo.findServiceForAvailability.mockResolvedValue({
      id: SERVICE_ID,
      providerId: 'provider-1',
      professionalId: PROFESSIONAL_ID,
      durationMinutes: 60,
    });

    const slots = await getSlotsForService(
      SERVICE_ID,
      MONDAY_UTC,
      new Date('2026-06-01T08:40:00.000Z'),
    );

    // 09:00Z está a 20 min: fuera. Solo queda el de 10:00Z.
    expect(slots.map((slot) => slot.startAt.toISOString())).toEqual(['2026-06-01T10:00:00.000Z']);
  });
});
