import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Límite exacto de la cancelación por el proveedor (§4.bis): a 2h00 se
 * acepta, a 1h59 no. Congelamos el reloj para que el test no dependa de
 * los milisegundos que pasan entre construir la reserva y cancelarla.
 *
 * Va en su propio fichero porque `booking.service.test.ts` ya supera
 * las ~250 líneas.
 */
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';

import { BookingTooLateToCancelError } from './booking.errors';
import { cancelBookingByProvider } from './booking.service';

const mockPrisma = vi.mocked(prisma, true);

const BOOKING_ID = 'c3d4e5f6-a7b8-4901-aabc-de0123456789';
const NOW = new Date('2026-10-05T10:00:00.000Z');

function bookingStartingAt(startIso: string) {
  const startAt = new Date(startIso);
  return {
    id: BOOKING_ID,
    startAt,
    endAt: new Date(startAt.getTime() + 60 * 60_000),
    status: 'confirmed',
    provider: { id: 'prov-1', userId: 'user-provider' },
  } as unknown as Awaited<ReturnType<typeof mockPrisma.booking.findUnique>>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cancelBookingByProvider — límite de 2 h', () => {
  it('acepta la cancelación exactamente a 2h00 del inicio', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(bookingStartingAt('2026-10-05T12:00:00.000Z'));
    mockPrisma.booking.update.mockResolvedValue({ id: BOOKING_ID } as never);

    await cancelBookingByProvider({ bookingId: BOOKING_ID }, 'user-provider');

    expect(mockPrisma.booking.update).toHaveBeenCalledOnce();
  });

  it('la rechaza a 1h59m59s del inicio', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(bookingStartingAt('2026-10-05T11:59:59.000Z'));

    await expect(
      cancelBookingByProvider({ bookingId: BOOKING_ID }, 'user-provider'),
    ).rejects.toBeInstanceOf(BookingTooLateToCancelError);
    expect(mockPrisma.booking.update).not.toHaveBeenCalled();
  });
});
