/**
 * `createBooking` frente a un bloqueo de agenda.
 *
 * El bloqueo puede crearse mientras el cliente elige hora: la
 * comprobación vive dentro de la transacción, tras el advisory lock que
 * también toma `createScheduleBlock`, y da `SlotUnavailableError`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => {
  const prisma = {
    service: { findUnique: vi.fn() },
    booking: { findMany: vi.fn(), create: vi.fn() },
    scheduleBlock: { count: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  return { prisma };
});

vi.mock('@/lib/services/slot-offers', () => ({
  findLiveOfferForSlot: vi.fn().mockResolvedValue(null),
  isBookableStart: vi.fn().mockResolvedValue(true),
  retireOfferOfCancelledBooking: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';

import { SlotUnavailableError } from './booking.errors';
import { createBooking } from './booking.service';

const mockPrisma = vi.mocked(prisma, true);

const SERVICE_ID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';
const PROFESSIONAL_ID = 'b2c3d4e5-f6a7-4890-9bcd-ef0123456789';
const MIN = 60 * 1000;

const service = {
  id: SERVICE_ID,
  providerId: 'prov-1',
  durationMinutes: 60,
  priceCents: 5000,
  isActive: true,
  deletedAt: null,
  provider: { id: 'prov-1', plan: { commissionRateBps: 800 } },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma)) as never);
  mockPrisma.service.findUnique.mockResolvedValue(service as never);
  mockPrisma.booking.findMany.mockResolvedValue([]);
  mockPrisma.booking.create.mockResolvedValue({ id: 'new-booking' } as never);
  mockPrisma.scheduleBlock.count.mockResolvedValue(0);
});

describe('createBooking con bloqueos de agenda', () => {
  it('un bloqueo activo que pisa la franja da SlotUnavailableError y no crea', async () => {
    mockPrisma.scheduleBlock.count.mockResolvedValue(1);
    const slotStart = new Date(Date.now() + 3 * 60 * MIN);

    await expect(
      createBooking({ serviceId: SERVICE_ID, professionalId: PROFESSIONAL_ID, slotStart }, 'c-1'),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
  });

  it('mira los bloqueos con el cliente de la transacción, tras el lock y sobre la franja', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * MIN);

    await createBooking(
      { serviceId: SERVICE_ID, professionalId: PROFESSIONAL_ID, slotStart },
      'c-1',
    );

    expect(mockPrisma.scheduleBlock.count).toHaveBeenCalledWith({
      where: {
        professionalId: PROFESSIONAL_ID,
        deletedAt: null,
        startAt: { lt: new Date(slotStart.getTime() + 60 * MIN) },
        endAt: { gt: slotStart },
      },
    });
    const lockAt = mockPrisma.$executeRaw.mock.invocationCallOrder[0];
    expect(lockAt).toBeLessThan(mockPrisma.scheduleBlock.count.mock.invocationCallOrder[0]);
    expect(mockPrisma.booking.create).toHaveBeenCalledOnce();
  });
});
