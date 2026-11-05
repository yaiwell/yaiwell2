/**
 * Tests del bloqueo de agenda al cancelar por incidencia: toma el mismo
 * bloqueo por profesional que `createBooking`, no pisa reservas activas, retira
 * ofertas y es repetible.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  lockProfessional: vi.fn(),
  findConflictingBookings: vi.fn(),
  withdrawOverlappingOffers: vi.fn(),
  hasCovering: vi.fn(),
  hasActiveOverlap: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: (run: (tx: unknown) => unknown) => run('tx') },
}));
vi.mock('@/lib/services/booking/booking.repository', () => ({
  bookingRepository: { lockProfessional: mocks.lockProfessional },
}));
vi.mock('./schedule-blocks.repository', () => ({ scheduleBlocksRepository: mocks }));

import { blockSlotForCentreIncident, readSlotForCentreIncident } from './schedule-blocks.incident';

const NOW = new Date('2026-11-05T10:00:00.000Z');
const START = new Date('2026-11-05T11:00:00.000Z');
const END = new Date('2026-11-05T12:00:00.000Z');
const ARGS = {
  providerId: 'prov-1',
  professionalId: 'pro-1',
  startAt: START,
  endAt: END,
  createdBy: 'admin-1',
  now: NOW,
};

describe('blockSlotForCentreIncident', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findConflictingBookings.mockResolvedValue([]);
    mocks.hasCovering.mockResolvedValue(false);
  });

  it('crea el bloqueo con el admin como autor, tras tomar el lock y retirar ofertas', async () => {
    await expect(blockSlotForCentreIncident(ARGS)).resolves.toBe(true);

    expect(mocks.lockProfessional).toHaveBeenCalledWith('tx', 'pro-1');
    expect(mocks.withdrawOverlappingOffers).toHaveBeenCalledWith('tx', 'pro-1', START, END, NOW);
    expect(mocks.create).toHaveBeenCalledWith('tx', {
      providerId: 'prov-1',
      professionalId: 'pro-1',
      startAt: START,
      endAt: END,
      reason: null,
      createdBy: 'admin-1',
    });
    const [lockOrder] = mocks.lockProfessional.mock.invocationCallOrder;
    const [createOrder] = mocks.create.mock.invocationCallOrder;
    expect(lockOrder).toBeLessThan(createOrder ?? 0);
  });

  it('no bloquea si otra reserva activa ya ocupó la franja', async () => {
    mocks.findConflictingBookings.mockResolvedValue([{ id: 'bk-2' }]);

    await expect(blockSlotForCentreIncident(ARGS)).resolves.toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('es repetible: si ya hay un bloqueo que la cubre, no crea otro', async () => {
    mocks.hasCovering.mockResolvedValue(true);

    await expect(blockSlotForCentreIncident(ARGS)).resolves.toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('readSlotForCentreIncident', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findConflictingBookings.mockResolvedValue([]);
    mocks.hasActiveOverlap.mockResolvedValue(false);
  });

  it('distingue ocupada, bloqueada y libre sin escribir nada', async () => {
    await expect(readSlotForCentreIncident('pro-1', START, END, NOW)).resolves.toBe('not_blocked');

    mocks.hasActiveOverlap.mockResolvedValue(true);
    await expect(readSlotForCentreIncident('pro-1', START, END, NOW)).resolves.toBe('blocked');

    mocks.findConflictingBookings.mockResolvedValue([{ id: 'bk-2' }]);
    await expect(readSlotForCentreIncident('pro-1', START, END, NOW)).resolves.toBe('taken');

    expect(mocks.create).not.toHaveBeenCalled();
  });
});
