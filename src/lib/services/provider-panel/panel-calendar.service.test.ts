import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mock del singleton Prisma: aquí no probamos la query sino el mapeo
 * a las dos proyecciones (cuadrícula + listado de acciones) y, sobre
 * todo, la conversión de instantes UTC a hora de Madrid, que hasta
 * ahora vivía sin tests dentro de `page.tsx`.
 */
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

import { getPanelWeekBookings, toPreviewBookingActions } from './panel-calendar.service';

const mockedFindMany = vi.mocked(prisma.booking.findMany);

/** Miércoles 14 de enero de 2026, 10:00 UTC (invierno, Madrid = CET). */
const NOW_WINTER = new Date('2026-01-14T10:00:00.000Z');

/**
 * Construye un registro con la forma que devuelve el `select` del
 * service. Se tipa como `never` al entregarlo al mock porque el tipo
 * generado por Prisma para ese select es mucho más ancho de lo que el
 * test necesita declarar.
 */
function bookingRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'bk-1',
    startAt: new Date('2026-01-12T08:00:00.000Z'),
    endAt: new Date('2026-01-12T09:00:00.000Z'),
    status: 'confirmed',
    priceCents: 4500,
    client: { fullName: 'Marta R.', email: 'marta@example.com' },
    service: { name: { es: 'Corte mujer', ca: 'Tall dona' } },
    professional: { name: 'Marina' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPanelWeekBookings', () => {
  it('consulta la semana en curso del proveedor, de lunes a lunes', async () => {
    mockedFindMany.mockResolvedValueOnce([] as never);

    await getPanelWeekBookings('prov-1', NOW_WINTER, 'es');

    const args = mockedFindMany.mock.calls[0]?.[0] as {
      where: { providerId: string; startAt: { gte: Date; lt: Date } };
    };
    expect(args.where.providerId).toBe('prov-1');
    expect(args.where.startAt.gte.toISOString()).toBe('2026-01-12T00:00:00.000Z');
    expect(args.where.startAt.lt.toISOString()).toBe('2026-01-19T00:00:00.000Z');
  });

  it('coloca una reserva del lunes 00:30 en Madrid (invierno) en la columna del lunes', async () => {
    // 23:30 UTC del domingo = 00:30 del lunes en Madrid (CET, UTC+1).
    // Si el cálculo usara la zona del servidor (Vercel = UTC) caería
    // en la columna del domingo, que es justo el bug que evitamos.
    mockedFindMany.mockResolvedValueOnce([
      bookingRecord({
        startAt: new Date('2026-01-11T23:30:00.000Z'),
        endAt: new Date('2026-01-12T00:30:00.000Z'),
      }),
    ] as never);

    const { calendar, actionable } = await getPanelWeekBookings('prov-1', NOW_WINTER, 'es');

    expect(calendar[0].weekday).toBe(0);
    expect(calendar[0].startTime).toBe('00:30');
    expect(calendar[0].endTime).toBe('01:30');
    expect(actionable[0].weekday).toBe(0);
  });

  it('formatea las horas en hora de verano de Madrid (CEST, UTC+2)', async () => {
    mockedFindMany.mockResolvedValueOnce([
      bookingRecord({
        startAt: new Date('2026-07-15T08:00:00.000Z'),
        endAt: new Date('2026-07-15T09:30:00.000Z'),
      }),
    ] as never);

    const { calendar } = await getPanelWeekBookings(
      'prov-1',
      new Date('2026-07-15T10:00:00.000Z'),
      'es',
    );

    expect(calendar[0].startTime).toBe('10:00');
    expect(calendar[0].endTime).toBe('11:30');
  });

  it('colapsa `refunded` a `cancelled` en la cuadrícula pero lo conserva en el listado', async () => {
    mockedFindMany.mockResolvedValueOnce([bookingRecord({ status: 'refunded' })] as never);

    const { calendar, actionable } = await getPanelWeekBookings('prov-1', NOW_WINTER, 'es');

    expect(calendar[0].status).toBe('cancelled');
    expect(actionable[0].status).toBe('refunded');
  });

  it('expone el instante real en ISO solo en el listado de acciones', async () => {
    mockedFindMany.mockResolvedValueOnce([bookingRecord()] as never);

    const { calendar, actionable } = await getPanelWeekBookings('prov-1', NOW_WINTER, 'es');

    expect(actionable[0].startAtIso).toBe('2026-01-12T08:00:00.000Z');
    expect(calendar[0]).not.toHaveProperty('startAtIso');
  });

  it('resuelve el nombre del servicio en el locale activo y cae al castellano', async () => {
    mockedFindMany.mockResolvedValueOnce([bookingRecord()] as never);

    const { calendar } = await getPanelWeekBookings('prov-1', NOW_WINTER, 'ca');

    expect(calendar[0].serviceName).toBe('Tall dona');
  });

  it('usa el email del cliente cuando no hay nombre y admite reservas sin profesional', async () => {
    mockedFindMany.mockResolvedValueOnce([
      bookingRecord({
        client: { fullName: null, email: 'anon@example.com' },
        professional: null,
      }),
    ] as never);

    const { calendar } = await getPanelWeekBookings('prov-1', NOW_WINTER, 'es');

    expect(calendar[0].clientName).toBe('anon@example.com');
    expect(calendar[0].professionalName).toBeNull();
  });
});

describe('toPreviewBookingActions', () => {
  it('marca las reservas de ejemplo sin instante real', () => {
    const [row] = toPreviewBookingActions([
      {
        id: 'bk-101',
        weekday: 0,
        startTime: '09:00',
        endTime: '10:00',
        clientName: 'Marta R.',
        serviceName: 'Corte mujer',
        professionalName: 'Marina',
        status: 'confirmed',
        priceCents: 5500,
      },
    ]);

    expect(row.startAtIso).toBeNull();
    expect(row.status).toBe('confirmed');
  });
});
