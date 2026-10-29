import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de `cancelBookingByClient` (§4.bis, decidido 2026-10-29).
 *
 * Fija los casos límite de la política del cliente: 2h00 se acepta y
 * 1h59 no, una confirmada de última hora nunca se cancela pero una
 * pendiente sí, una reserva ajena o en un estado no activo se rechaza,
 * la escritura es condicional y la oferta de origen no se retira.
 */

vi.mock('@/lib/db/prisma', () => ({
  prisma: { booking: { findUnique: vi.fn(), updateMany: vi.fn() } },
}));

const { retireOfferMock } = vi.hoisted(() => ({ retireOfferMock: vi.fn() }));
vi.mock('@/lib/services/slot-offers', () => ({
  retireOfferOfCancelledBooking: retireOfferMock,
}));

import { prisma } from '@/lib/db/prisma';

import { cancelBookingByClient } from './booking.client-cancel.service';
import {
  BookingNotCancellableError,
  BookingNotFoundError,
  BookingTooLateToCancelError,
  LastMinuteBookingNotCancellableError,
  UnauthorizedCancellationError,
} from './booking.errors';

const mockPrisma = vi.mocked(prisma, true);

const BOOKING_ID = 'c3d4e5f6-a7b8-4901-aabc-de0123456789';
const CLIENT_ID = 'user-client';
const NOW = new Date('2026-10-05T10:00:00.000Z');
const HOUR = 60 * 60_000;

type Row = Awaited<ReturnType<typeof mockPrisma.booking.findUnique>>;

/** Reserva hecha con un día de margen (no es de última hora). */
function booking(overrides: Record<string, unknown> = {}): Row {
  const startAt = new Date(NOW.getTime() + 24 * HOUR);
  return {
    id: BOOKING_ID,
    clientId: CLIENT_ID,
    status: 'confirmed',
    startAt,
    endAt: new Date(startAt.getTime() + HOUR),
    createdAt: new Date(NOW.getTime() - 24 * HOUR),
    slotOfferId: null,
    stripePaymentIntentId: 'pi_1',
    provider: { id: 'prov-1', userId: 'user-provider' },
    ...overrides,
  } as unknown as Row;
}

/** Primera lectura: la reserva tal cual; relectura tras escribir: cancelada. */
function givenBooking(overrides: Record<string, unknown> = {}) {
  const row = booking(overrides);
  mockPrisma.booking.findUnique.mockResolvedValueOnce(row).mockResolvedValueOnce({
    ...row,
    status: 'cancelled',
    stripePaymentIntentId: 'pi_reread',
  } as Row);
}

/** Reserva de última hora: creada 1h59 antes de un inicio a 3 h vista. */
function lastMinute(status: string) {
  const startAt = new Date(NOW.getTime() + 3 * HOUR);
  return { status, startAt, createdAt: new Date(startAt.getTime() - 2 * HOUR + 60_000) };
}

const input = { bookingId: BOOKING_ID };

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
});

describe('cancelBookingByClient', () => {
  it('cancela con escritura condicional y devuelve la fila releída', async () => {
    givenBooking();

    const result = await cancelBookingByClient(input, CLIENT_ID, NOW);

    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: { in: ['pending', 'confirmed'] } },
      data: { status: 'cancelled', cancelledAt: NOW },
    });
    expect(result).toMatchObject({
      status: 'cancelled',
      previousStatus: 'confirmed',
      stripePaymentIntentId: 'pi_reread',
    });
  });

  it('si otro camino la movió antes de escribir (0 filas), lanza BookingNotCancellableError', async () => {
    givenBooking();
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).rejects.toBeInstanceOf(
      BookingNotCancellableError,
    );
  });

  it('acepta exactamente a 2h00 del inicio', async () => {
    givenBooking({ startAt: new Date(NOW.getTime() + 2 * HOUR) });

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).resolves.toMatchObject({
      status: 'cancelled',
    });
  });

  it('rechaza a 1h59 del inicio sin escribir', async () => {
    givenBooking({ startAt: new Date(NOW.getTime() + 2 * HOUR - 60_000) });

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).rejects.toBeInstanceOf(
      BookingTooLateToCancelError,
    );
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('rechaza una confirmada de última hora aunque falten más de 2 h', async () => {
    givenBooking(lastMinute('confirmed'));

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).rejects.toBeInstanceOf(
      LastMinuteBookingNotCancellableError,
    );
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('admite una pending de última hora (sin cobro)', async () => {
    givenBooking(lastMinute('pending'));

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).resolves.toMatchObject({
      previousStatus: 'pending',
    });
  });

  it('admite una pending a menos de 2 h, pero no una que ya ha empezado', async () => {
    givenBooking({ status: 'pending', startAt: new Date(NOW.getTime() + 45 * 60_000) });
    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).resolves.toBeDefined();

    givenBooking({ status: 'pending', startAt: NOW });
    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).rejects.toBeInstanceOf(
      BookingTooLateToCancelError,
    );
  });

  it('rechaza la reserva de otro cliente', async () => {
    givenBooking({ clientId: 'otro' });

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).rejects.toBeInstanceOf(
      UnauthorizedCancellationError,
    );
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('rechaza una reserva inexistente', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).rejects.toBeInstanceOf(
      BookingNotFoundError,
    );
  });

  it.each(['cancelled', 'refunded', 'completed'])('rechaza una reserva %s', async (status) => {
    givenBooking({ status });

    await expect(cancelBookingByClient(input, CLIENT_ID, NOW)).rejects.toBeInstanceOf(
      BookingNotCancellableError,
    );
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('no retira la oferta de origen: la hora vuelve a anunciarse con su descuento', async () => {
    givenBooking({ slotOfferId: 'offer-1' });

    await cancelBookingByClient(input, CLIENT_ID, NOW);

    expect(retireOfferMock).not.toHaveBeenCalled();
  });

  it('rechaza un bookingId que no es UUID antes de leer la BD', async () => {
    await expect(cancelBookingByClient({ bookingId: 'x' }, CLIENT_ID, NOW)).rejects.toThrow();
    expect(mockPrisma.booking.findUnique).not.toHaveBeenCalled();
  });
});
