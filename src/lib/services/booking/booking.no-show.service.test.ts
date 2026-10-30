/**
 * Tests de «no presentado»: marcar (ventana de 72 h, sanción solo en el
 * local, idempotencia) y deshacer (ventana de 24 h, revocación, cierre
 * si ya pasaron las 72 h, carrera con la reventa de la franja).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', async () => {
  const { createPrismaMock } = await import('./booking.test-fixtures');
  return { prisma: createPrismaMock() };
});

import { prisma } from '@/lib/db/prisma';

import {
  BookingNotConfirmedError,
  BookingNotNoShowError,
  BookingNotStartedError,
  NoShowUndoWindowClosedError,
  NoShowWindowClosedError,
  SlotUnavailableError,
  UnauthorizedCancellationError,
} from './booking.errors';
import { markBookingNoShow, undoBookingNoShow } from './booking.no-show.service';
import {
  BOOKING_ID,
  CLIENT_ID,
  HOUR,
  OWNER_ID,
  START,
  at,
  fakeBooking,
} from './booking.test-fixtures';

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma)) as never);
  mockPrisma.clientSanction.findMany.mockResolvedValue([]);
});

describe('markBookingNoShow', () => {
  it('en el local: marca con escritura condicional y sanciona (ON CONFLICT DO NOTHING)', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking() as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.findMany.mockResolvedValue([
      { occurredAt: START, revokedAt: null },
    ] as never);

    const now = at(HOUR);
    const result = await markBookingNoShow(BOOKING_ID, OWNER_ID, now);

    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: 'confirmed' },
      data: { status: 'no_show', noShowAt: now, noShowMarkedBy: OWNER_ID },
    });
    expect(mockPrisma.clientSanction.createMany).toHaveBeenCalledWith({
      data: [{ userId: CLIENT_ID, bookingId: BOOKING_ID, occurredAt: START, reason: 'no_show' }],
      skipDuplicates: true,
    });
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      clientId: CLIENT_ID,
      paymentMode: 'onsite',
      changed: true,
      sanctionApplied: true,
      eligibility: { sanctionsInWindow: 1, restrictedUntil: null },
    });
  });

  it('la tercera sanción en 12 meses devuelve hasta cuándo solo online', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking() as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.findMany.mockResolvedValue([
      { occurredAt: new Date('2026-06-01T10:00:00Z'), revokedAt: null },
      { occurredAt: new Date('2026-09-01T10:00:00Z'), revokedAt: null },
      { occurredAt: START, revokedAt: null },
    ] as never);

    const result = await markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR));

    expect(result.eligibility?.sanctionsInWindow).toBe(3);
    expect(result.eligibility?.restrictedUntil?.toISOString()).toBe('2027-02-02T10:00:00.000Z');
  });

  it('online: marca sin sanción (ni devolución)', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(
      fakeBooking({ paymentMode: 'online' }) as never,
    );
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });

    const result = await markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR));

    expect(mockPrisma.clientSanction.createMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ changed: true, sanctionApplied: false, eligibility: null });
  });

  it('doble clic: si ya está no_show devuelve changed=false sin escribir', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(
      fakeBooking({ status: 'no_show', noShowAt: at(HOUR) }) as never,
    );

    const result = await markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR));

    expect(result.changed).toBe(false);
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.clientSanction.createMany).not.toHaveBeenCalled();
  });

  it('doble clic simultáneo: 0 filas y ya no_show → changed=false, sin sanción', async () => {
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce(fakeBooking() as never)
      .mockResolvedValueOnce({ status: 'no_show' } as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

    const result = await markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR));

    expect(result.changed).toBe(false);
    expect(mockPrisma.clientSanction.createMany).not.toHaveBeenCalled();
  });

  it('carrera con el cierre automático: 0 filas y completed → BookingNotConfirmedError', async () => {
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce(fakeBooking() as never)
      .mockResolvedValueOnce({ status: 'completed' } as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR))).rejects.toBeInstanceOf(
      BookingNotConfirmedError,
    );
    expect(mockPrisma.clientSanction.createMany).not.toHaveBeenCalled();
  });

  it('antes del inicio → BookingNotStartedError; en el inicio exacto ya se puede', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking() as never);
    await expect(markBookingNoShow(BOOKING_ID, OWNER_ID, at(-1))).rejects.toBeInstanceOf(
      BookingNotStartedError,
    );

    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 1 });
    await expect(markBookingNoShow(BOOKING_ID, OWNER_ID, START)).resolves.toMatchObject({
      changed: true,
    });
  });

  it('a las 72 h justas se puede; un instante después → NoShowWindowClosedError', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking() as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 1 });
    await expect(markBookingNoShow(BOOKING_ID, OWNER_ID, at(72 * HOUR))).resolves.toMatchObject({
      changed: true,
    });

    await expect(markBookingNoShow(BOOKING_ID, OWNER_ID, at(72 * HOUR + 1))).rejects.toBeInstanceOf(
      NoShowWindowClosedError,
    );
  });

  it.each(['pending', 'completed', 'cancelled', 'refunded'])('rechaza desde %s', async (status) => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ status }) as never);
    await expect(markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR))).rejects.toBeInstanceOf(
      BookingNotConfirmedError,
    );
  });

  it('otro negocio → UnauthorizedCancellationError', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ ownerId: 'otro' }) as never);
    await expect(markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR))).rejects.toBeInstanceOf(
      UnauthorizedCancellationError,
    );
  });
});

describe('undoBookingNoShow', () => {
  const noShowAt = at(2 * HOUR);
  const marked = (overrides = {}) =>
    fakeBooking({ status: 'no_show', noShowAt, ...overrides }) as never;

  it('dentro de 72 h: vuelve a confirmed y revoca la sanción en la misma transacción', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(marked());
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 1 });
    const now = at(3 * HOUR);

    const result = await undoBookingNoShow(BOOKING_ID, OWNER_ID, now);

    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: 'no_show' },
      data: { status: 'confirmed', noShowAt: null, noShowMarkedBy: null },
    });
    expect(mockPrisma.clientSanction.updateMany).toHaveBeenCalledWith({
      where: { bookingId: BOOKING_ID, revokedAt: null },
      data: { revokedAt: now, revokedBy: OWNER_ID, revokeReason: 'undo_by_provider' },
    });
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: 'confirmed',
      sanctionRevoked: true,
      onsiteCommissionChargeId: null,
    });
  });

  it('a las 24 h justas aún se puede; un instante después → NoShowUndoWindowClosedError', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(marked());
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 1 });
    const limit = new Date(noShowAt.getTime() + 24 * HOUR);
    await expect(undoBookingNoShow(BOOKING_ID, OWNER_ID, limit)).resolves.toMatchObject({
      status: 'confirmed',
    });

    await expect(
      undoBookingNoShow(BOOKING_ID, OWNER_ID, new Date(limit.getTime() + 1)),
    ).rejects.toBeInstanceOf(NoShowUndoWindowClosedError);
  });

  it('pasadas las 72 h del inicio: la completa con comisión y revoca la sanción', async () => {
    const lateMark = at(71 * HOUR);
    mockPrisma.booking.findUnique.mockResolvedValue(marked({ noShowAt: lateMark }));
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.onsiteCommissionCharge.create.mockResolvedValue({ id: 'charge-9' } as never);
    const now = at(80 * HOUR);

    const result = await undoBookingNoShow(BOOKING_ID, OWNER_ID, now);

    expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: BOOKING_ID, status: 'no_show' },
      data: { status: 'completed', completedAt: now, noShowAt: null, noShowMarkedBy: null },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: 'completed',
      sanctionRevoked: true,
      onsiteCommissionChargeId: 'charge-9',
    });
  });

  it('online: deshace sin sanción que revocar', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(marked({ paymentMode: 'online' }));
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.clientSanction.updateMany.mockResolvedValue({ count: 0 });

    const result = await undoBookingNoShow(BOOKING_ID, OWNER_ID, at(3 * HOUR));

    expect(result.sanctionRevoked).toBe(false);
  });

  it('doble clic: ya no está no_show → BookingNotNoShowError', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ status: 'confirmed' }) as never);
    await expect(undoBookingNoShow(BOOKING_ID, OWNER_ID, at(3 * HOUR))).rejects.toBeInstanceOf(
      BookingNotNoShowError,
    );
    expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('carrera (0 filas) → BookingNotNoShowError y sin revocar', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(marked());
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await expect(undoBookingNoShow(BOOKING_ID, OWNER_ID, at(3 * HOUR))).rejects.toBeInstanceOf(
      BookingNotNoShowError,
    );
    expect(mockPrisma.clientSanction.updateMany).not.toHaveBeenCalled();
  });

  it('la franja se volvió a vender (23P01) → SlotUnavailableError', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(marked());
    mockPrisma.$transaction.mockRejectedValueOnce({
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "bookings_no_overlap_confirmed"',
    });

    await expect(undoBookingNoShow(BOOKING_ID, OWNER_ID, at(3 * HOUR))).rejects.toBeInstanceOf(
      SlotUnavailableError,
    );
  });
});
