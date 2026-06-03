/**
 * Tests del servicio booking.
 *
 * Mockeamos el singleton Prisma (`@/lib/db/prisma`) — tanto para el
 * uso directo desde el service (`prisma.service.findUnique`) como
 * para el repository (que internamente usa el mismo singleton).
 *
 * Cubrimos:
 *  - createBooking: happy path, solapamiento, slot demasiado pronto.
 *  - cancelBookingByProvider: happy path, ventana < 2 h, no titular.
 *  - markBookingCompleted: happy path, estado distinto de confirmed.
 */

import { ZodError } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// El mock de Prisma debe declararse antes de los imports del SUT
// para que el repository y el service capturen las versiones mockeadas.
vi.mock('@/lib/db/prisma', () => {
  return {
    prisma: {
      service: {
        findUnique: vi.fn(),
      },
      booking: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

import { prisma } from '@/lib/db/prisma';

import {
  BookingNotConfirmedError,
  BookingTooLateToCancelError,
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

function fakeService(overrides: Partial<{ durationMinutes: number; priceCents: number }> = {}) {
  return {
    id: SERVICE_ID,
    providerId: PROVIDER_ID,
    durationMinutes: overrides.durationMinutes ?? 60,
    priceCents: overrides.priceCents ?? 5000,
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
});

describe('createBooking', () => {
  const baseInput = {
    serviceId: SERVICE_ID,
    professionalId: PROFESSIONAL_ID,
  };

  it('crea la reserva en estado pending cuando no hay solapamientos', async () => {
    // Slot a 3 h vista para superar la regla de antelación de 2 h.
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

  it('rechaza con SlotUnavailableError si hay solapamiento', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * 60 * 1000);

    mockPrisma.service.findUnique.mockResolvedValue(fakeService());
    mockPrisma.booking.findMany.mockResolvedValue([{ id: 'existing' }] as never);

    await expect(createBooking({ ...baseInput, slotStart }, 'client-1')).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError si el slot está a menos de 2 h vista', async () => {
    // Solo 1 h vista: la regla de antelación mínima debe disparar.
    const slotStart = new Date(Date.now() + 60 * 60_000);

    await expect(createBooking({ ...baseInput, slotStart }, 'client-1')).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(mockPrisma.service.findUnique).not.toHaveBeenCalled();
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
