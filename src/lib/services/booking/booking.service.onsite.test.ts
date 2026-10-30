/**
 * Tests de `createBooking` con pago en el local (migración 9f): nace
 * `confirmed`, solo con 2 h o más de antelación, y la exclusión de
 * solapes de la BD (23P01) se traduce a `SlotUnavailableError`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => {
  const prisma = {
    service: { findUnique: vi.fn() },
    booking: { findMany: vi.fn(), create: vi.fn() },
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

import { OnsiteBookingTooLateError, SlotUnavailableError } from './booking.errors';
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
});

function input(slotStart: Date) {
  return { serviceId: SERVICE_ID, professionalId: PROFESSIONAL_ID, slotStart };
}

describe('createBooking en el local', () => {
  it('nace confirmed con paymentMode onsite y la misma comisión del plan', async () => {
    const now = new Date();
    const slotStart = new Date(now.getTime() + 3 * 60 * MIN);

    await createBooking(input(slotStart), 'client-1', { paymentMode: 'onsite', now });

    const { data } = mockPrisma.booking.create.mock.calls[0][0];
    expect(data.status).toBe('confirmed');
    expect(data.paymentMode).toBe('onsite');
    expect(data.commissionCents).toBe(400);
    expect(data.createdAt).toBe(now);
  });

  it('online por defecto: pending', async () => {
    const slotStart = new Date(Date.now() + 3 * 60 * MIN);
    await createBooking(input(slotStart), 'client-1');
    const { data } = mockPrisma.booking.create.mock.calls[0][0];
    expect(data.status).toBe('pending');
    expect(data.paymentMode).toBe('online');
  });

  it('a 2h00 justas se permite (con el mismo reloj que el caller)', async () => {
    const now = new Date();
    const slotStart = new Date(now.getTime() + 120 * MIN);

    await createBooking(input(slotStart), 'client-1', { paymentMode: 'onsite', now });

    expect(mockPrisma.booking.create).toHaveBeenCalledOnce();
  });

  it('a 1h59 → OnsiteBookingTooLateError, sin tocar la BD', async () => {
    const now = new Date();
    const slotStart = new Date(now.getTime() + 119 * MIN);

    await expect(
      createBooking(input(slotStart), 'client-1', { paymentMode: 'onsite', now }),
    ).rejects.toBeInstanceOf(OnsiteBookingTooLateError);
    expect(mockPrisma.service.findUnique).not.toHaveBeenCalled();
  });

  it('una violación de la exclusión (23P01) → SlotUnavailableError', async () => {
    const now = new Date();
    const slotStart = new Date(now.getTime() + 3 * 60 * MIN);
    mockPrisma.booking.create.mockRejectedValue({
      code: 'P2010',
      meta: {
        driverAdapterError: {
          cause: {
            originalCode: '23P01',
            originalMessage:
              'conflicting key value violates exclusion constraint "bookings_no_overlap_confirmed"',
          },
        },
      },
    });

    await expect(
      createBooking(input(slotStart), 'client-1', { paymentMode: 'onsite', now }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it('otros errores de BD se propagan tal cual', async () => {
    const now = new Date();
    const slotStart = new Date(now.getTime() + 3 * 60 * MIN);
    const boom = new Error('connection lost');
    mockPrisma.booking.create.mockRejectedValue(boom);

    await expect(
      createBooking(input(slotStart), 'client-1', { paymentMode: 'onsite', now }),
    ).rejects.toBe(boom);
  });
});
