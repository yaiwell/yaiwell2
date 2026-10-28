/**
 * Tests del servicio booking.
 *
 * Mockeamos el singleton Prisma (`@/lib/db/prisma`) — tanto para el
 * uso directo desde el service (`prisma.service.findUnique`) como
 * para el repository (que internamente usa el mismo singleton).
 *
 * Cubrimos:
 *  - createBooking: happy path, solapamiento, slot demasiado pronto.
 *  - cancelBookingByProvider: happy path, ventana < 2 h, no titular,
 *    estados no cancelables.
 *  - markBookingCompleted: happy path, estado distinto de confirmed.
 */

import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// El mock de Prisma debe declararse antes de los imports del SUT
// para que el repository y el service capturen las versiones mockeadas.
vi.mock('@/lib/db/prisma', () => {
  const prisma = {
    service: {
      findUnique: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn(),
    // La transacción ejecuta el callback con el propio mock como `tx`.
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return { prisma };
});

// La oferta vigente se prueba en su módulo; aquí la controlamos a mano.
const { findLiveOfferForSlotMock, isBookableStartMock, retireOfferMock } = vi.hoisted(() => ({
  findLiveOfferForSlotMock: vi.fn(),
  isBookableStartMock: vi.fn(),
  retireOfferMock: vi.fn(),
}));
vi.mock('@/lib/services/slot-offers', () => ({
  findLiveOfferForSlot: findLiveOfferForSlotMock,
  isBookableStart: isBookableStartMock,
  retireOfferOfCancelledBooking: retireOfferMock,
}));

import { prisma } from '@/lib/db/prisma';

import {
  BookingNotCancellableError,
  BookingNotConfirmedError,
  BookingTooLateToCancelError,
  ServiceNotFoundError,
  ServicePausedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';
import { cancelBookingByProvider, createBooking, markBookingCompleted } from './booking.service';

/**
 * Atajos tipados a los mocks. `vi.mocked` reusa la inferencia de TS
 * para no tener que castear cada llamada.
 */
const mockPrisma = vi.mocked(prisma, true);

/**
 * Helper para construir un Service ficticio con las relaciones
 * necesarias (`provider.plan`). Solo rellenamos los campos que el
 * servicio consume; el resto se castea para no arrastrar el modelo
 * Prisma completo en cada test.
 */
/**
 * UUIDs v4 reales usados a lo largo de los tests. Zod v4 valida
 * estrictamente la versión (3er grupo empieza por 1-8) y la variante
 * (4º grupo empieza por 8, 9, a o b).
 */
const SERVICE_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const PROFESSIONAL_ID = 'b2c3d4e5-f6a7-4890-9bcd-ef0123456789';
const BOOKING_ID = 'c3d4e5f6-a7b8-4901-aabc-de0123456789';
const PROVIDER_ID = 'd4e5f6a7-b8c9-4012-8bcd-ef0123456789';

function fakeService(
  overrides: Partial<{
    durationMinutes: number;
    priceCents: number;
    isActive: boolean;
    deletedAt: Date | null;
  }> = {},
) {
  return {
    id: SERVICE_ID,
    providerId: PROVIDER_ID,
    durationMinutes: overrides.durationMinutes ?? 60,
    priceCents: overrides.priceCents ?? 5000,
    isActive: overrides.isActive ?? true,
    deletedAt: overrides.deletedAt ?? null,
    provider: {
      id: PROVIDER_ID,
      userId: 'user-provider',
      plan: {
        commissionRateBps: 800, // 8.00%
      },
    },
  } as unknown as Awaited<ReturnType<typeof mockPrisma.service.findUnique>>;
}

/**
 * Helper para construir un Booking ficticio con el provider embebido.
 */
function fakeBooking(overrides: {
  startAt: Date;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  providerUserId?: string;
}) {
  return {
    id: BOOKING_ID,
    startAt: overrides.startAt,
    endAt: new Date(overrides.startAt.getTime() + 60 * 60_000),
    status: overrides.status ?? 'confirmed',
    provider: {
      id: PROVIDER_ID,
      userId: overrides.providerUserId ?? 'user-provider',
    },
  } as unknown as Awaited<ReturnType<typeof mockPrisma.booking.findUnique>>;
}

beforeEach(() => {
  vi.clearAllMocks();
  findLiveOfferForSlotMock.mockResolvedValue(null);
  isBookableStartMock.mockResolvedValue(true);
});

describe('createBooking', () => {
  const baseInput = {
    serviceId: SERVICE_ID,
    professionalId: PROFESSIONAL_ID,
  };

  it('crea la reserva en estado pending cuando no hay solapamientos', async () => {
    // Slot a 3 h vista: holgado frente a la antelación mínima (30 min).
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);

    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.create.mockResolvedValue({ id: 'new-booking' } as never);

    await createBooking({ ...baseInput, slotStart }, 'client-1');

    expect(mockPrisma.booking.create).toHaveBeenCalledOnce();
    const createArgs = mockPrisma.booking.create.mock.calls[0][0];
    expect(createArgs.data.status).toBe('pending');
    expect(createArgs.data.clientId).toBe('client-1');
    expect(createArgs.data.priceCents).toBe(5000);
    // 8% de 5000 = 400.
    expect(createArgs.data.commissionCents).toBe(400);
    // El endAt es slotStart + 60 min (duración del fakeService).
    expect((createArgs.data.endAt as Date).getTime()).toBe(slotStart.getTime() + 60 * 60_000);
  });

  it('bloquea al profesional dentro de la transacción antes de comprobar el solape', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);
    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.create.mockResolvedValue({ id: 'new-booking' } as never);

    await createBooking({ ...baseInput, slotStart }, 'client-1');

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    const lockOrder = mockPrisma.$executeRaw.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(mockPrisma.booking.findMany.mock.invocationCallOrder[0]);
    expect(mockPrisma.$executeRaw.mock.calls[0].slice(1)).toEqual([PROFESSIONAL_ID]);
  });

  it('aplica el descuento vigente del hueco liberado y la comisión sobre lo cobrado', async () => {
    // A 90 min vista: tramo de 1 a 2 h (20 %).
    const slotStart = new Date(Date.now() + 90 * 60 * 1000);
    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.create.mockResolvedValue({ id: 'new-booking' } as never);
    findLiveOfferForSlotMock.mockResolvedValue({
      id: 'offer-1',
      discounts: { over2h: 10, oneToTwoHours: 20, underOneHour: 30 },
    });

    await createBooking({ ...baseInput, slotStart }, 'client-1');

    expect(findLiveOfferForSlotMock).toHaveBeenCalledWith(
      PROFESSIONAL_ID,
      SERVICE_ID,
      slotStart,
      expect.any(Date),
      expect.anything(),
    );
    const { data } = mockPrisma.booking.create.mock.calls[0][0];
    expect(data.priceCents).toBe(4000);
    expect(data.originalPriceCents).toBe(5000);
    expect(data.discountPct).toBe(20);
    expect(data.slotOfferId).toBe('offer-1');
    // 8 % de 4000 = 320: la comisión baja con el precio.
    expect(data.commissionCents).toBe(320);
  });

  it('sin oferta (o con tramo a 0 %) cobra el precio normal sin datos de descuento', async () => {
    const slotStart = new Date(Date.now() + 90 * 60 * 1000);
    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.create.mockResolvedValue({ id: 'new-booking' } as never);
    findLiveOfferForSlotMock.mockResolvedValue({
      id: 'offer-1',
      discounts: { over2h: 0, oneToTwoHours: 0, underOneHour: 20 },
    });

    await createBooking({ ...baseInput, slotStart }, 'client-1');

    const { data } = mockPrisma.booking.create.mock.calls[0][0];
    expect(data.priceCents).toBe(5000);
    expect(data.slotOfferId).toBeNull();
    expect(data.discountPct).toBeNull();
    expect(data.originalPriceCents).toBeNull();
  });

  it('rechaza una hora que no ofrecemos (fuera de rejilla y sin oferta)', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);
    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    isBookableStartMock.mockResolvedValue(false);

    await expect(createBooking({ ...baseInput, slotStart }, 'client-1')).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
  });

  it('usa el mismo instante para el tramo y para createdAt', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);
    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.create.mockResolvedValue({ id: 'new-booking' } as never);

    await createBooking({ ...baseInput, slotStart }, 'client-1');

    const { data } = mockPrisma.booking.create.mock.calls[0][0];
    expect(data.createdAt).toEqual(findLiveOfferForSlotMock.mock.calls[0][3]);
  });

  it('rechaza con SlotUnavailableError si hay solapamiento', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);

    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    mockPrisma.booking.findMany.mockResolvedValue([{ id: 'existing' }] as never);

    await expect(createBooking({ ...baseInput, slotStart }, 'client-1')).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError si el slot está a menos de 30 min vista', async () => {
    // Solo 20 min vista: la regla de antelación mínima debe disparar.
    const slotStart = new Date(Date.now() + 20 * 60_000);

    await expect(createBooking({ ...baseInput, slotStart }, 'client-1')).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(mockPrisma.service.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza con ServicePausedError si el servicio está pausado', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);

    mockPrisma.service.findUnique.mockResolvedValue(fakeService({ isActive: false }));

    await expect(createBooking({ ...baseInput, slotStart }, 'client-1')).rejects.toBeInstanceOf(
      ServicePausedError,
    );
    expect(mockPrisma.booking.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
  });

  it('rechaza con ServiceNotFoundError si el servicio está soft-deleted', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);

    mockPrisma.service.findUnique.mockResolvedValue(fakeService({ deletedAt: new Date() }));

    await expect(createBooking({ ...baseInput, slotStart }, 'client-1')).rejects.toBeInstanceOf(
      ServiceNotFoundError,
    );
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
  });
});

describe('cancelBookingByProvider', () => {
  const bookingId = BOOKING_ID;

  it('cancela la reserva cuando faltan más de 2 horas', async () => {
    // 5 horas hasta el inicio: margen sobrado.
    const startAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ startAt }));
    mockPrisma.booking.update.mockResolvedValue({ id: bookingId } as never);

    await cancelBookingByProvider({ bookingId }, 'user-provider');

    expect(mockPrisma.booking.update).toHaveBeenCalledOnce();
    const updateArgs = mockPrisma.booking.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('cancelled');
    expect(updateArgs.data.cancelledAt).toBeInstanceOf(Date);
  });

  it('rechaza con BookingTooLateToCancelError a 1 h 59 min del inicio', async () => {
    // 1 h 59 min = 119 minutos: por debajo del umbral de 2 h.
    const startAt = new Date(Date.now() + 119 * 60_000);
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ startAt }));

    await expect(cancelBookingByProvider({ bookingId }, 'user-provider')).rejects.toBeInstanceOf(
      BookingTooLateToCancelError,
    );
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('rechaza con BookingNotCancellableError si la reserva ya está reembolsada', async () => {
    // Margen de sobra: lo que bloquea aquí es el estado, no el reloj.
    // Sin esta guardia se emitiría un segundo refund sobre el mismo cobro.
    const startAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ startAt, status: 'refunded' }));

    await expect(cancelBookingByProvider({ bookingId }, 'user-provider')).rejects.toBeInstanceOf(
      BookingNotCancellableError,
    );
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('rechaza con BookingNotCancellableError si el servicio ya se prestó', async () => {
    const startAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ startAt, status: 'completed' }));

    await expect(cancelBookingByProvider({ bookingId }, 'user-provider')).rejects.toBeInstanceOf(
      BookingNotCancellableError,
    );
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });

  it('prioriza el estado sobre la ventana de 2 h en el mensaje de error', async () => {
    // Una reserva cancelada y además a 1 h del inicio debe decir "ya no
    // se puede cancelar", no "llegas tarde": el motivo real es el estado.
    const startAt = new Date(Date.now() + 60 * 60_000);
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ startAt, status: 'cancelled' }));

    await expect(cancelBookingByProvider({ bookingId }, 'user-provider')).rejects.toBeInstanceOf(
      BookingNotCancellableError,
    );
  });

  it('rechaza con UnauthorizedCancellationError si el userId no es el dueño', async () => {
    const startAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
    mockPrisma.booking.findUnique.mockResolvedValue(
      fakeBooking({ startAt, providerUserId: 'user-otro' }),
    );

    await expect(cancelBookingByProvider({ bookingId }, 'user-provider')).rejects.toBeInstanceOf(
      UnauthorizedCancellationError,
    );
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
});

describe('markBookingCompleted', () => {
  const bookingId = BOOKING_ID;

  it('marca como completada cuando el estado actual es confirmed', async () => {
    const startAt = new Date(Date.now() - 60 * 60_000); // ya pasó
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ startAt, status: 'confirmed' }));
    mockPrisma.booking.update.mockResolvedValue({ id: bookingId } as never);

    await markBookingCompleted(bookingId, 'user-provider');

    expect(mockPrisma.booking.update).toHaveBeenCalledOnce();
    const updateArgs = mockPrisma.booking.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('completed');
    expect(updateArgs.data.completedAt).toBeInstanceOf(Date);
  });

  it('rechaza con BookingNotConfirmedError si el estado actual es pending', async () => {
    const startAt = new Date(Date.now() - 60 * 60_000);
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ startAt, status: 'pending' }));

    await expect(markBookingCompleted(bookingId, 'user-provider')).rejects.toBeInstanceOf(
      BookingNotConfirmedError,
    );
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
});
