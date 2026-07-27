import { describe, expect, it, vi } from 'vitest';

import { computeProviderAvailability } from './availability.status.calc';
import type { ProfessionalScheduleBundle, Slot, WeeklySchedule } from './availability.types';

const MADRID = 'Europe/Madrid';
const PROVIDER_ID = 'provider-1';

/**
 * Horario abierto todos los días de 10:00 a 20:00 (hora de Madrid).
 * Abrir los 7 días es deliberado: así los tests no dependen de qué día
 * de la semana cae la fecha elegida y se centran en los umbrales.
 */
const OPEN_EVERY_DAY: WeeklySchedule = {
  monday: [{ open: '10:00', close: '20:00' }],
  tuesday: [{ open: '10:00', close: '20:00' }],
  wednesday: [{ open: '10:00', close: '20:00' }],
  thursday: [{ open: '10:00', close: '20:00' }],
  friday: [{ open: '10:00', close: '20:00' }],
  saturday: [{ open: '10:00', close: '20:00' }],
  sunday: [{ open: '10:00', close: '20:00' }],
};

const CLOSED_EVERY_DAY: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

/**
 * Julio → Madrid está en CEST (UTC+2). Con duración 60 y buffer 0 los
 * slots caen a las 10:00, 11:00… hora local, es decir 08:00Z, 09:00Z…
 */
function bundle(overrides: Partial<ProfessionalScheduleBundle> = {}): ProfessionalScheduleBundle {
  return {
    professionalId: 'prof-1',
    providerId: PROVIDER_ID,
    schedule: OPEN_EVERY_DAY,
    bufferMinutes: 0,
    minServiceDurationMinutes: 60,
    ...overrides,
  };
}

function run(params: {
  now: string;
  bundles: ProfessionalScheduleBundle[];
  bookingsByProfessional?: Map<string, Slot[]>;
  onInvalidSchedule?: (b: ProfessionalScheduleBundle, issues: unknown) => void;
}) {
  return computeProviderAvailability({
    now: new Date(params.now),
    providerIds: [PROVIDER_ID],
    bundles: params.bundles,
    bookingsByProfessional: params.bookingsByProfessional ?? new Map(),
    timezone: MADRID,
    onInvalidSchedule: params.onInvalidSchedule,
  }).get(PROVIDER_ID);
}

describe('computeProviderAvailability — umbrales', () => {
  it('marca available_now cuando el hueco está a 10 minutos', () => {
    // 07:50Z = 09:50 Madrid; primer slot a las 10:00 Madrid (08:00Z).
    const result = run({ now: '2026-07-27T07:50:00.000Z', bundles: [bundle()] });
    expect(result?.status).toBe('available_now');
    expect(result?.nextSlot?.startAt.toISOString()).toBe('2026-07-27T08:00:00.000Z');
  });

  it('incluye el borde exacto de 15 minutos en available_now', () => {
    const result = run({ now: '2026-07-27T07:45:00.000Z', bundles: [bundle()] });
    expect(result?.status).toBe('available_now');
  });

  it('pasa a available_soon justo por encima de 15 minutos', () => {
    const result = run({ now: '2026-07-27T07:44:00.000Z', bundles: [bundle()] });
    expect(result?.status).toBe('available_soon');
  });

  it('incluye el borde exacto de 60 minutos en available_soon', () => {
    const result = run({ now: '2026-07-27T07:00:00.000Z', bundles: [bundle()] });
    expect(result?.status).toBe('available_soon');
  });

  it('pasa a busy justo por encima de 60 minutos', () => {
    const result = run({ now: '2026-07-27T06:59:00.000Z', bundles: [bundle()] });
    expect(result?.status).toBe('busy');
  });
});

describe('computeProviderAvailability — nextSlot', () => {
  it('conserva nextSlot aunque el estado sea busy (alimenta "Hoy a las X")', () => {
    // 04:00Z = 06:00 Madrid: la apertura está a 4 horas vista.
    const result = run({ now: '2026-07-27T04:00:00.000Z', bundles: [bundle()] });
    expect(result?.status).toBe('busy');
    expect(result?.nextSlot?.startAt.toISOString()).toBe('2026-07-27T08:00:00.000Z');
  });

  it('devuelve busy sin nextSlot cuando el profesional no trabaja', () => {
    const result = run({
      now: '2026-07-27T07:50:00.000Z',
      bundles: [bundle({ schedule: CLOSED_EVERY_DAY })],
    });
    expect(result).toEqual({ status: 'busy', nextSlot: null });
  });

  it('salta los huecos ya ocupados por reservas', () => {
    // Reserva de 10:00 a 12:00 Madrid (08:00Z-10:00Z): el primer hueco
    // libre pasa a ser las 12:00 Madrid (10:00Z).
    const bookings = new Map<string, Slot[]>([
      [
        'prof-1',
        [
          {
            startAt: new Date('2026-07-27T08:00:00.000Z'),
            endAt: new Date('2026-07-27T10:00:00.000Z'),
          },
        ],
      ],
    ]);
    const result = run({
      now: '2026-07-27T07:50:00.000Z',
      bundles: [bundle()],
      bookingsByProfessional: bookings,
    });
    expect(result?.status).toBe('busy');
    expect(result?.nextSlot?.startAt.toISOString()).toBe('2026-07-27T10:00:00.000Z');
  });
});

describe('computeProviderAvailability — centros con varios profesionales', () => {
  it('gana el profesional más libre', () => {
    const bookings = new Map<string, Slot[]>([
      [
        'prof-ocupado',
        [
          {
            startAt: new Date('2026-07-27T08:00:00.000Z'),
            endAt: new Date('2026-07-27T18:00:00.000Z'),
          },
        ],
      ],
    ]);
    const result = run({
      now: '2026-07-27T07:50:00.000Z',
      bundles: [
        bundle({ professionalId: 'prof-ocupado' }),
        bundle({ professionalId: 'prof-libre' }),
      ],
      bookingsByProfessional: bookings,
    });
    expect(result?.status).toBe('available_now');
  });
});

describe('computeProviderAvailability — degradación', () => {
  it('degrada a busy sin lanzar cuando el horario es inválido', () => {
    const onInvalidSchedule = vi.fn();
    // Falta el resto de días: no pasa `weeklyScheduleSchema`.
    const result = run({
      now: '2026-07-27T07:50:00.000Z',
      bundles: [bundle({ schedule: { monday: [] } })],
      onInvalidSchedule,
    });
    expect(result).toEqual({ status: 'busy', nextSlot: null });
    expect(onInvalidSchedule).toHaveBeenCalledOnce();
  });

  it('degrada a busy cuando el proveedor no tiene servicios activos', () => {
    const result = run({
      now: '2026-07-27T07:50:00.000Z',
      bundles: [bundle({ minServiceDurationMinutes: null })],
    });
    expect(result).toEqual({ status: 'busy', nextSlot: null });
  });

  it('devuelve busy para proveedores sin ningún profesional', () => {
    const result = run({ now: '2026-07-27T07:50:00.000Z', bundles: [] });
    expect(result).toEqual({ status: 'busy', nextSlot: null });
  });

  it('ignora profesionales de proveedores no solicitados', () => {
    const map = computeProviderAvailability({
      now: new Date('2026-07-27T07:50:00.000Z'),
      providerIds: [PROVIDER_ID],
      bundles: [bundle({ providerId: 'otro-provider' })],
      bookingsByProfessional: new Map(),
      timezone: MADRID,
    });
    expect(map.size).toBe(1);
    expect(map.get(PROVIDER_ID)).toEqual({ status: 'busy', nextSlot: null });
  });
});
