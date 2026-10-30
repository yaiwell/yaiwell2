/**
 * Tests del enganche de la alerta de no presentados por negocio en
 * `markBookingNoShow` (antiabuso 2026-10-30): solo tras un marcado real
 * en el local, fuera de la transacción.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkRateMock } = vi.hoisted(() => ({ checkRateMock: vi.fn() }));

vi.mock('@/lib/db/prisma', async () => {
  const { createPrismaMock } = await import('./booking.test-fixtures');
  return { prisma: createPrismaMock() };
});
vi.mock('@/lib/services/sanctions/sanctions.alerts', () => ({
  checkProviderNoShowRate: checkRateMock,
}));

import { prisma } from '@/lib/db/prisma';

import { markBookingNoShow } from './booking.no-show.service';
import { BOOKING_ID, HOUR, OWNER_ID, PROVIDER_ID, at, fakeBooking } from './booking.test-fixtures';

const mockPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma)) as never);
  mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.clientSanction.createMany.mockResolvedValue({ count: 1 });
  mockPrisma.clientSanction.findMany.mockResolvedValue([]);
  checkRateMock.mockResolvedValue(undefined);
});

describe('markBookingNoShow · alerta de tasa de no presentados', () => {
  it('en el local: revisa la tasa del negocio tras la transacción', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking() as never);
    const now = at(HOUR);
    await markBookingNoShow(BOOKING_ID, OWNER_ID, now);

    expect(checkRateMock).toHaveBeenCalledWith(PROVIDER_ID, now);
    expect(checkRateMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockPrisma.$transaction.mock.invocationCallOrder[0],
    );
  });

  it('pagada online: no revisa nada', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(
      fakeBooking({ paymentMode: 'online' }) as never,
    );
    await markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR));
    expect(checkRateMock).not.toHaveBeenCalled();
  });

  it('ya estaba no_show (doble clic): no revisa nada', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(fakeBooking({ status: 'no_show' }) as never);
    await markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR));
    expect(checkRateMock).not.toHaveBeenCalled();
  });

  it('la carrera dejó 0 filas: no revisa nada', async () => {
    mockPrisma.booking.findUnique
      .mockResolvedValueOnce(fakeBooking() as never)
      .mockResolvedValueOnce(fakeBooking({ status: 'no_show' }) as never);
    mockPrisma.booking.updateMany.mockResolvedValue({ count: 0 });
    await markBookingNoShow(BOOKING_ID, OWNER_ID, at(HOUR));
    expect(checkRateMock).not.toHaveBeenCalled();
  });
});
