/**
 * Tests del filtro por rango de días: qué días cubre cada opción en hora de
 * Madrid y qué proveedores tienen hueco reservable dentro.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const repoMock = vi.hoisted(() => ({
  findScheduleBundlesForProviders: vi.fn(),
  findBookingsForProviders: vi.fn(),
  findScheduleBlocksForProviders: vi.fn(),
}));

vi.mock('./availability.repository', () => ({ availabilityRepository: repoMock }));

import { getFirstSlotInRangeByProvider, resolveWhenDays } from './availability.range';

const TZ = 'Europe/Madrid';
const PROVIDER = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
const OTHER = '1b2f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5d';

const keys = (days: Date[]) => days.map((d) => d.toISOString().slice(0, 10));

/** Abierto todos los días de 10:00 a 12:00. */
function openEveryDay() {
  const day = [{ open: '10:00', close: '12:00' }];
  return {
    monday: day,
    tuesday: day,
    wednesday: day,
    thursday: day,
    friday: day,
    saturday: day,
    sunday: day,
  };
}

function bundle(providerId: string, schedule: unknown = openEveryDay()) {
  return {
    providerId,
    professionalId: `pro-${providerId}`,
    schedule,
    bufferMinutes: 0,
    minServiceDurationMinutes: 60,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repoMock.findBookingsForProviders.mockResolvedValue([]);
  repoMock.findScheduleBlocksForProviders.mockResolvedValue([]);
});

describe('resolveWhenDays', () => {
  // Jueves 5 de noviembre de 2026.
  const THURSDAY = new Date('2026-11-05T10:00:00.000Z');

  it('hoy y mañana son un solo día', () => {
    expect(keys(resolveWhenDays('today', THURSDAY, TZ))).toEqual(['2026-11-05']);
    expect(keys(resolveWhenDays('tomorrow', THURSDAY, TZ))).toEqual(['2026-11-06']);
  });

  it('esta semana llega hasta el domingo', () => {
    expect(keys(resolveWhenDays('this-week', THURSDAY, TZ))).toEqual([
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
  });

  it('en domingo, esta semana es solo hoy', () => {
    const sunday = new Date('2026-11-08T10:00:00.000Z');
    expect(keys(resolveWhenDays('this-week', sunday, TZ))).toEqual(['2026-11-08']);
  });

  it('usa el día de Madrid, no el de UTC', () => {
    // 23:30 UTC del jueves ya es viernes en Madrid.
    const lateNight = new Date('2026-11-05T23:30:00.000Z');
    expect(keys(resolveWhenDays('today', lateNight, TZ))).toEqual(['2026-11-06']);
  });
});

describe('getFirstSlotInRangeByProvider', () => {
  // Jueves a las 09:00 en Madrid.
  const NOW = new Date('2026-11-05T08:00:00.000Z');

  it('sin proveedores no toca la BD', async () => {
    expect((await getFirstSlotInRangeByProvider([], 'today', NOW)).size).toBe(0);
    expect(repoMock.findScheduleBundlesForProviders).not.toHaveBeenCalled();
  });

  it('devuelve el primer hueco del día pedido', async () => {
    repoMock.findScheduleBundlesForProviders.mockResolvedValue([bundle(PROVIDER)]);

    const result = await getFirstSlotInRangeByProvider([PROVIDER], 'tomorrow', NOW);

    // 10:00 en Madrid es 09:00 UTC en noviembre.
    expect(result.get(PROVIDER)?.startAt.toISOString()).toBe('2026-11-06T09:00:00.000Z');
  });

  it('no cuenta lo que está dentro de la antelación mínima', async () => {
    repoMock.findScheduleBundlesForProviders.mockResolvedValue([bundle(PROVIDER)]);
    // Jueves 11:45 en Madrid: ya no cabe nada reservable hoy.
    const late = new Date('2026-11-05T10:45:00.000Z');

    const result = await getFirstSlotInRangeByProvider([PROVIDER], 'today', late);

    expect(result.has(PROVIDER)).toBe(false);
  });

  it('excluye al proveedor con la agenda llena y conserva al otro', async () => {
    repoMock.findScheduleBundlesForProviders.mockResolvedValue([bundle(PROVIDER), bundle(OTHER)]);
    repoMock.findBookingsForProviders.mockResolvedValue([
      {
        professionalId: `pro-${PROVIDER}`,
        startAt: new Date('2026-11-06T09:00:00.000Z'),
        endAt: new Date('2026-11-06T11:00:00.000Z'),
      },
    ]);

    const result = await getFirstSlotInRangeByProvider([PROVIDER, OTHER], 'tomorrow', NOW);

    expect(result.has(PROVIDER)).toBe(false);
    expect(result.has(OTHER)).toBe(true);
  });

  it('un bloqueo de agenda ocupa igual que una reserva', async () => {
    repoMock.findScheduleBundlesForProviders.mockResolvedValue([bundle(PROVIDER)]);
    repoMock.findScheduleBlocksForProviders.mockResolvedValue([
      {
        professionalId: `pro-${PROVIDER}`,
        startAt: new Date('2026-11-06T09:00:00.000Z'),
        endAt: new Date('2026-11-06T11:00:00.000Z'),
      },
    ]);

    const result = await getFirstSlotInRangeByProvider([PROVIDER], 'tomorrow', NOW);

    expect(result.has(PROVIDER)).toBe(false);
  });

  it('un horario corrupto no tumba el resto', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    repoMock.findScheduleBundlesForProviders.mockResolvedValue([
      bundle(PROVIDER, 'roto'),
      bundle(OTHER),
    ]);

    const result = await getFirstSlotInRangeByProvider([PROVIDER, OTHER], 'tomorrow', NOW);

    expect(result.has(PROVIDER)).toBe(false);
    expect(result.has(OTHER)).toBe(true);
  });
});
