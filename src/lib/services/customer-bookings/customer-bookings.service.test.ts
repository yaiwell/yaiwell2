import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mock del singleton Prisma: lo que se prueba aquí no es la query en sí
 * sino (a) que el filtro por `clientId` viaja a BD — es la frontera de
 * seguridad de `/mis-reservas` — y (b) el mapeo a `CustomerBookingView`,
 * en particular los casos que la versión fake nunca produjo: proveedor
 * sin fotos, reserva sin review y cliente sin ninguna reserva.
 */
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

import { getCustomerBookings } from './customer-bookings.service';

const mockedFindMany = vi.mocked(prisma.booking.findMany);

/**
 * Construye un registro con la forma exacta que devuelve el `select`
 * del repositorio. Se entrega al mock como `never` porque el tipo que
 * Prisma genera para ese select es mucho más ancho de lo que el test
 * necesita declarar.
 */
function bookingRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bkg-1',
    status: 'confirmed',
    startAt: new Date('2026-07-15T08:00:00.000Z'),
    endAt: new Date('2026-07-15T09:00:00.000Z'),
    priceCents: 4500,
    notes: null,
    serviceId: 'svc-1',
    service: { name: { es: 'Masaje relax', ca: 'Massatge relax' } },
    professional: { name: 'Eva M.' },
    provider: {
      id: 'prov-1',
      businessName: 'Casa Mar',
      slug: 'casa-mar',
      address: 'Carrer X 1, Gràcia',
      photos: ['https://example.com/cover.jpg'],
    },
    review: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCustomerBookings', () => {
  it('consulta BD filtrando por el clientId recibido', async () => {
    mockedFindMany.mockResolvedValueOnce([] as never);

    await getCustomerBookings('user-42');

    const args = mockedFindMany.mock.calls[0]?.[0] as { where: { clientId: string } };
    expect(args.where).toEqual({ clientId: 'user-42' });
  });

  it('no devuelve reservas de otro cliente', async () => {
    // Simulamos la tabla completa y dejamos que el mock aplique el
    // mismo filtro que aplicaría Postgres, para comprobar que el
    // service delega el aislamiento en el `where` y no en un filtro
    // posterior que pudiera olvidarse.
    const table = [bookingRecord({ id: 'bkg-mine' }), bookingRecord({ id: 'bkg-other' })] as const;
    const owners: Record<string, string> = { 'bkg-mine': 'user-42', 'bkg-other': 'user-99' };

    mockedFindMany.mockImplementationOnce((args: unknown) => {
      const clientId = (args as { where: { clientId: string } }).where.clientId;
      return Promise.resolve(table.filter((r) => owners[r.id] === clientId)) as never;
    });

    const result = await getCustomerBookings('user-42');

    expect(result.map((b) => b.id)).toEqual(['bkg-mine']);
  });

  it('devuelve una lista vacía cuando el cliente no tiene reservas', async () => {
    mockedFindMany.mockResolvedValueOnce([] as never);

    await expect(getCustomerBookings('user-nuevo')).resolves.toEqual([]);
  });

  it('mapea las relaciones a la forma que consume la UI', async () => {
    mockedFindMany.mockResolvedValueOnce([
      bookingRecord({ notes: 'Llego 5 minutos antes.' }),
    ] as never);

    const [booking] = await getCustomerBookings('user-42');

    expect(booking).toMatchObject({
      id: 'bkg-1',
      status: 'confirmed',
      priceCents: 4500,
      serviceName: { es: 'Masaje relax', ca: 'Massatge relax' },
      professionalName: 'Eva M.',
      providerId: 'prov-1',
      providerName: 'Casa Mar',
      providerSlug: 'casa-mar',
      providerAddress: 'Carrer X 1, Gràcia',
      providerPhoto: 'https://example.com/cover.jpg',
      hasReview: false,
      notes: 'Llego 5 minutos antes.',
    });
  });

  it('normaliza a null la foto cuando el proveedor no tiene ninguna', async () => {
    mockedFindMany.mockResolvedValueOnce([
      bookingRecord({
        provider: {
          id: 'prov-1',
          businessName: 'Casa Mar',
          slug: 'casa-mar',
          address: 'Carrer X 1',
          photos: [],
        },
      }),
    ] as never);

    const [booking] = await getCustomerBookings('user-42');

    expect(booking.providerPhoto).toBeNull();
  });

  it('marca hasReview según exista o no la relación review', async () => {
    mockedFindMany.mockResolvedValueOnce([
      bookingRecord({ id: 'bkg-con', status: 'completed', review: { id: 'rev-1' } }),
      bookingRecord({ id: 'bkg-sin', status: 'completed', review: null }),
    ] as never);

    const result = await getCustomerBookings('user-42');

    expect(result.find((b) => b.id === 'bkg-con')?.hasReview).toBe(true);
    expect(result.find((b) => b.id === 'bkg-sin')?.hasReview).toBe(false);
  });

  it('convierte las notas nulas en undefined', async () => {
    mockedFindMany.mockResolvedValueOnce([bookingRecord({ notes: null })] as never);

    const [booking] = await getCustomerBookings('user-42');

    expect(booking.notes).toBeUndefined();
  });
});
