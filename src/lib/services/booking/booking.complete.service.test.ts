/**
 * Tests del cierre de reservas como `completed`: a mano desde el panel y
 * automático a las 72 h para las reservas en el local.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', async () => {
  const { createPrismaMock } = await import('./booking.test-fixtures');
  return { prisma: createPrismaMock() };
});

import { prisma } from '@/lib/db/prisma';

import {
  autoCompleteStaleBookings,
  autoCompleteStaleOnsiteBookings,
  markBookingCompleted,
} from './booking.complete.service';
import {
  BookingNotConfirmedError,
  BookingNotStartedError,
  BookingNotFoundError,
  UnauthorizedCancellationError,
} from './booking.errors';
import {
  BOOKING_ID,
  HOUR,
  OWNER_ID,
  PROVIDER_ID,
  START,
  at,
  fakeBooking,
} from './booking.test-fixtures';

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma)) as never);
});

describe('markBookingCompleted', () => {
  it('online: completa con escritura condicional y sin comisión encolada', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(
      fakeBooking({ paymentMode: 'online' }) as never,
    );
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await markBookingCompleted(BOOKING_ID, OWNER_ID, at(HOUR));

    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: 'confirmed' },
      data: { status: 'completed', completedAt: at(HOUR) },
    });
    expect(mockPrisma.onsiteCommissionCharge.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      paymentMode: 'online',
      onsiteCommissionChargeId: null,
    });
  });

  it('en el local: encola la comisión (pending, = commissionCents) en la misma transacción', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ commissionCents: 640 }) as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.onsiteCommissionCharge.create.mockResolvedValue({ id: 'charge-1' } as never);

    const result = await markBookingCompleted(BOOKING_ID, OWNER_ID, at(HOUR));

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(mockPrisma.onsiteCommissionCharge.create).toHaveBeenCalledWith({
      data: { bookingId: BOOKING_ID, providerId: PROVIDER_ID, amountCents: 640, status: 'pending' },
      select: { id: true },
    });
    expect(result.onsiteCommissionChargeId).toBe('charge-1');
  });

  it('carrera (0 filas: el cron o «no presentado» se adelantaron) → error y sin comisión', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking() as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(markBookingCompleted(BOOKING_ID, OWNER_ID, at(HOUR))).rejects.toBeInstanceOf(
      BookingNotConfirmedError,
    );
    expect(mockPrisma.onsiteCommissionCharge.create).not.toHaveBeenCalled();
  });

  it('1 minuto antes del inicio → BookingNotStartedError, sin escribir ni comisión', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking() as never);

    await expect(markBookingCompleted(BOOKING_ID, OWNER_ID, at(-60 * 1000))).rejects.toBeInstanceOf(
      BookingNotStartedError,
    );
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.onsiteCommissionCharge.create).not.toHaveBeenCalled();
  });

  it.each(['pending', 'completed', 'no_show', 'cancelled'])(
    'rechaza desde %s sin escribir',
    async (status) => {
      mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ status }) as never);

      await expect(markBookingCompleted(BOOKING_ID, OWNER_ID)).rejects.toBeInstanceOf(
        BookingNotConfirmedError,
      );
      expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
    },
  );

  it('no existe / no es del negocio', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);
    await expect(markBookingCompleted(BOOKING_ID, OWNER_ID)).rejects.toBeInstanceOf(
      BookingNotFoundError,
    );

    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ ownerId: 'otro' }) as never);
    await expect(markBookingCompleted(BOOKING_ID, OWNER_ID)).rejects.toBeInstanceOf(
      UnauthorizedCancellationError,
    );
  });
});

describe('autoCompleteStaleBookings', () => {
  const NOW = at(100 * HOUR);
  const stale = (id: string, paymentMode: 'online' | 'onsite' = 'onsite') => ({
    id,
    providerId: PROVIDER_ID,
    commissionCents: 400,
    paymentMode,
  });

  it('busca confirmed (online y en el local) con startAt < now − 72 h y respeta el tope', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await autoCompleteStaleBookings(NOW, 25);

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'confirmed',
          startAt: { lt: at(28 * HOUR) },
        },
        take: 25,
        orderBy: { startAt: 'asc' },
      }),
    );
  });

  it('completa cada una, encola su comisión y devuelve ids para valorar e itemizar', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([stale('b-1'), stale('b-2')] as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.onsiteCommissionCharge.create
      .mockResolvedValueOnce({ id: 'c-1' } as never)
      .mockResolvedValueOnce({ id: 'c-2' } as never);

    const summary = await autoCompleteStaleBookings(NOW);

    expect(summary).toEqual({
      completedBookingIds: ['b-1', 'b-2'],
      commissionChargeIds: ['c-1', 'c-2'],
      failedBookingIds: [],
    });
    expect(mockPrisma.booking.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'b-1', status: 'confirmed' },
      data: { status: 'completed', completedAt: NOW },
    });
  });

  it('si el negocio marcó «no presentado» en la carrera (0 filas), la salta sin comisión', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([stale('b-1')] as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

    const summary = await autoCompleteStaleBookings(NOW);

    expect(summary.completedBookingIds).toEqual([]);
    expect(mockPrisma.onsiteCommissionCharge.create).not.toHaveBeenCalled();
  });

  it('un fallo no frena las demás', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPrisma.booking.findMany.mockResolvedValue([stale('b-1'), stale('b-2')] as never);
    mockPrisma.booking.updateMany
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ count: 1 });
    mockPrisma.onsiteCommissionCharge.create.mockResolvedValue({ id: 'c-2' } as never);

    const summary = await autoCompleteStaleBookings(NOW);

    expect(summary).toEqual({
      completedBookingIds: ['b-2'],
      commissionChargeIds: ['c-2'],
      failedBookingIds: ['b-1'],
    });
  });

  it('online: la completa (invitar a valorar) sin encolar comisión nueva', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([
      stale('b-online', 'online'),
      stale('b-onsite'),
    ] as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.onsiteCommissionCharge.create.mockResolvedValue({ id: 'c-onsite' } as never);

    const summary = await autoCompleteStaleBookings(NOW);

    expect(summary).toEqual({
      completedBookingIds: ['b-online', 'b-onsite'],
      commissionChargeIds: ['c-onsite'],
      failedBookingIds: [],
    });
    expect(mockPrisma.onsiteCommissionCharge.create).toHaveBeenCalledOnce();
    expect(mockPrisma.booking.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'b-online', status: 'confirmed' },
      data: { status: 'completed', completedAt: NOW },
    });
  });

  it('online en carrera (0 filas): no la cuenta como completada', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([stale('b-online', 'online')] as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

    const summary = await autoCompleteStaleBookings(NOW);

    expect(summary.completedBookingIds).toEqual([]);
  });

  it('el alias antiguo apunta a la misma función', () => {
    expect(autoCompleteStaleOnsiteBookings).toBe(autoCompleteStaleBookings);
  });

  it('a las 72 h justas no entra (corte estricto)', async () => {
    mockPrisma.booking.findMany.mockResolvedValue([]);
    await autoCompleteStaleBookings(at(72 * HOUR));
    const where = mockPrisma.booking.findMany.mock.calls[0][0]?.where;
    expect(where?.startAt).toEqual({ lt: START });
  });
});
