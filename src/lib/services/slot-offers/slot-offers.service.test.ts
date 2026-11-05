import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo, getServiceDaySlotsMock, blockOverlapMock } = vi.hoisted(() => ({
  repo: {
    findBookingForRelease: vi.fn(),
    findServiceWithOwner: vi.fn(),
    hasActiveBookingOverlap: vi.fn(),
    hasActiveOfferOverlap: vi.fn(),
    create: vi.fn(),
    findWithOwner: vi.fn(),
    withdraw: vi.fn(),
  },
  getServiceDaySlotsMock: vi.fn(),
  blockOverlapMock: vi.fn(),
}));

vi.mock('./slot-offers.repository', () => ({ slotOffersRepository: repo }));
vi.mock('@/lib/services/schedule-blocks/schedule-blocks.repository', () => ({
  scheduleBlocksRepository: { hasActiveOverlap: blockOverlapMock },
}));
vi.mock('@/lib/services/availability', async () => {
  const errors = await import('@/lib/services/availability/availability.errors');
  return {
    BUSINESS_TIMEZONE: 'Europe/Madrid',
    getCivilDayUtc: (d: Date) => d,
    getServiceDaySlots: getServiceDaySlotsMock,
    ProfessionalNotForServiceError: errors.ProfessionalNotForServiceError,
  };
});

import {
  SlotOfferAlreadyExistsError,
  SlotOfferForbiddenError,
  SlotOfferOutsideWindowError,
  SlotOfferServiceInvalidError,
  SlotOfferSlotTakenError,
  SlotOfferSourceIncidentError,
  SlotOfferSourceNotCancelledError,
} from './slot-offers.errors';
import { releaseCancelledSlot, releaseFreeSlot, withdrawSlotOffer } from './slot-offers.service';

const NOW = new Date('2026-10-28T10:00:00.000Z');
const START = new Date('2026-10-28T14:00:00.000Z'); // a 4 h
const DISCOUNTS = { over2h: 10, oneToTwoHours: 20, underOneHour: 30 };
const OWNER = 'user-owner';

function cancelledBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-1',
    status: 'cancelled',
    startAt: START,
    endAt: new Date(START.getTime() + 60 * 60_000),
    serviceId: 'svc-1',
    professionalId: 'pro-1',
    providerId: 'prov-1',
    provider: { userId: OWNER },
    ...overrides,
  };
}

function service(overrides: Record<string, unknown> = {}) {
  return {
    id: 'svc-1',
    providerId: 'prov-1',
    durationMinutes: 60,
    isActive: true,
    deletedAt: null,
    provider: { userId: OWNER },
    // Quién presta el servicio (`service_professionals`).
    professionals: [{ professionalId: 'pro-1' }],
    ...overrides,
  };
}

/** Rejilla del motor con los candidatos libres de cada hora. */
function engine(byProfessional: Record<string, Date[]>, durationMinutes = 60) {
  const slotsByProfessional = new Map<string, { startAt: Date; endAt: Date }[]>();
  const candidatesByStart = new Map<number, string[]>();
  const union = new Map<number, { startAt: Date; endAt: Date }>();
  for (const [id, starts] of Object.entries(byProfessional)) {
    const slots = starts.map((startAt) => ({
      startAt,
      endAt: new Date(startAt.getTime() + durationMinutes * 60_000),
    }));
    slotsByProfessional.set(id, slots);
    for (const slot of slots) {
      union.set(slot.startAt.getTime(), slot);
      candidatesByStart.set(slot.startAt.getTime(), [
        ...(candidatesByStart.get(slot.startAt.getTime()) ?? []),
        id,
      ]);
    }
  }
  return {
    providerId: 'prov-1',
    durationMinutes,
    professionalIds: Object.keys(byProfessional),
    slots: [...union.values()],
    slotsByProfessional,
    candidatesByStart,
  };
}

function createdRow(data: Record<string, unknown>) {
  const d = data as { discounts: typeof DISCOUNTS };
  return {
    id: 'offer-1',
    ...data,
    discountPctOver2h: d.discounts.over2h,
    discountPct1To2h: d.discounts.oneToTwoHours,
    discountPctUnder1h: d.discounts.underOneHour,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repo.findBookingForRelease.mockResolvedValue(cancelledBooking());
  repo.findServiceWithOwner.mockResolvedValue(service());
  repo.hasActiveBookingOverlap.mockResolvedValue(false);
  repo.hasActiveOfferOverlap.mockResolvedValue(false);
  blockOverlapMock.mockResolvedValue(false);
  repo.create.mockImplementation(async (data: Record<string, unknown>) => createdRow(data));
});

describe('releaseCancelledSlot', () => {
  const input = { bookingId: 'bk-1', discounts: DISCOUNTS };

  it('crea la oferta con la hora y el profesional de la reserva, caducando a 30 min', async () => {
    const offer = await releaseCancelledSlot(input, OWNER, NOW);

    expect(offer.discounts).toEqual(DISCOUNTS);
    const data = repo.create.mock.calls[0][0];
    expect(data).toMatchObject({
      professionalId: 'pro-1',
      serviceId: 'svc-1',
      sourceBookingId: 'bk-1',
      startAt: START,
    });
    expect(data.expiresAt.toISOString()).toBe('2026-10-28T13:30:00.000Z');
  });

  it('rechaza liberar una hora que pisa un bloqueo de agenda', async () => {
    blockOverlapMock.mockResolvedValue(true);

    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferSlotTakenError,
    );
    expect(blockOverlapMock).toHaveBeenCalledWith(
      'pro-1',
      START,
      new Date(START.getTime() + 60 * 60_000),
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('solo el dueño, solo reservas canceladas o reembolsadas', async () => {
    await expect(releaseCancelledSlot(input, 'otro', NOW)).rejects.toBeInstanceOf(
      SlotOfferForbiddenError,
    );
    repo.findBookingForRelease.mockResolvedValue(cancelledBooking({ status: 'confirmed' }));
    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferSourceNotCancelledError,
    );
    repo.findBookingForRelease.mockResolvedValue(cancelledBooking({ status: 'refunded' }));
    await expect(releaseCancelledSlot(input, OWNER, NOW)).resolves.toBeTruthy();
  });

  it('rechaza una reserva cancelada por incidencia del centro', async () => {
    repo.findBookingForRelease.mockResolvedValue(cancelledBooking({ incidentRefundAt: NOW }));
    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferSourceIncidentError,
    );
  });

  it('rechaza un servicio que no cabe en la franja', async () => {
    repo.findServiceWithOwner.mockResolvedValue(service({ durationMinutes: 90 }));
    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferServiceInvalidError,
    );
  });

  it('rechaza un servicio que el profesional de la reserva no presta', async () => {
    repo.findServiceWithOwner.mockResolvedValue(
      service({ professionals: [{ professionalId: 'pro-2' }] }),
    );
    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferServiceInvalidError,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('con varios profesionales vale si el de la reserva es uno de ellos', async () => {
    repo.findServiceWithOwner.mockResolvedValue(
      service({ professionals: [{ professionalId: 'pro-2' }, { professionalId: 'pro-1' }] }),
    );
    await releaseCancelledSlot(input, OWNER, NOW);
    expect(repo.create.mock.calls[0][0]).toMatchObject({ professionalId: 'pro-1' });
  });

  it('rechaza si ya no da tiempo a reservarlo o el hueco se ocupó', async () => {
    const tooLate = new Date(START.getTime() - 20 * 60_000);
    await expect(releaseCancelledSlot(input, OWNER, tooLate)).rejects.toBeInstanceOf(
      SlotOfferOutsideWindowError,
    );
    repo.hasActiveBookingOverlap.mockResolvedValue(true);
    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferSlotTakenError,
    );
  });

  it('rechaza si pisa otra oferta activa', async () => {
    repo.hasActiveOfferOverlap.mockResolvedValue(true);
    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferAlreadyExistsError,
    );
  });

  it('una segunda oferta del mismo hueco es SlotOfferAlreadyExistsError', async () => {
    repo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    await expect(releaseCancelledSlot(input, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferAlreadyExistsError,
    );
  });

  it('valida los tramos: tope 50 % y nunca menos descuento más cerca', async () => {
    await expect(
      releaseCancelledSlot(
        { ...input, discounts: { over2h: 30, oneToTwoHours: 20, underOneHour: 60 } },
        OWNER,
        NOW,
      ),
    ).rejects.toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('releaseFreeSlot', () => {
  const soon = new Date(NOW.getTime() + 60 * 60_000); // a 1 h

  it('libera una hora que el motor ofrece ahora, con su profesional', async () => {
    getServiceDaySlotsMock.mockResolvedValue(engine({ 'pro-9': [soon] }));

    await releaseFreeSlot(
      { serviceId: 'svc-1', startAt: soon.toISOString(), discounts: DISCOUNTS },
      OWNER,
      'prov-1',
      NOW,
    );

    expect(repo.create.mock.calls[0][0]).toMatchObject({
      professionalId: 'pro-9',
      sourceBookingId: null,
      startAt: soon,
    });
  });

  it('rechaza huecos a 2 h o más y horas que el motor no ofrece', async () => {
    const far = new Date(NOW.getTime() + 2 * 3_600_000);
    await expect(
      releaseFreeSlot(
        { serviceId: 'svc-1', startAt: far.toISOString(), discounts: DISCOUNTS },
        OWNER,
        'prov-1',
        NOW,
      ),
    ).rejects.toBeInstanceOf(SlotOfferOutsideWindowError);

    getServiceDaySlotsMock.mockResolvedValue(engine({ 'pro-9': [] }));
    await expect(
      releaseFreeSlot(
        { serviceId: 'svc-1', startAt: soon.toISOString(), discounts: DISCOUNTS },
        OWNER,
        'prov-1',
        NOW,
      ),
    ).rejects.toBeInstanceOf(SlotOfferSlotTakenError);
  });

  it('con profesional elegido, pide la rejilla de ese profesional', async () => {
    getServiceDaySlotsMock.mockResolvedValue(engine({ 'pro-2': [soon] }));

    await releaseFreeSlot(
      { serviceId: 'svc-1', professionalId: 'pro-2', startAt: soon, discounts: DISCOUNTS },
      OWNER,
      'prov-1',
      NOW,
    );

    expect(getServiceDaySlotsMock).toHaveBeenCalledWith('svc-1', expect.any(Date), NOW, 'pro-2');
    expect(repo.create.mock.calls[0][0]).toMatchObject({ professionalId: 'pro-2' });
  });

  it('sin profesional elegido salta al siguiente libre si el primero ya tiene oferta', async () => {
    getServiceDaySlotsMock.mockResolvedValue(engine({ 'pro-1': [soon], 'pro-2': [soon] }));
    repo.hasActiveOfferOverlap.mockImplementation(async (id: string) => id === 'pro-1');

    await releaseFreeSlot(
      { serviceId: 'svc-1', startAt: soon, discounts: DISCOUNTS },
      OWNER,
      'prov-1',
      NOW,
    );

    expect(repo.create.mock.calls[0][0]).toMatchObject({ professionalId: 'pro-2' });
  });

  it('un profesional que no presta el servicio es SlotOfferServiceInvalidError', async () => {
    const { ProfessionalNotForServiceError } =
      await import('@/lib/services/availability/availability.errors');
    getServiceDaySlotsMock.mockRejectedValue(new ProfessionalNotForServiceError());

    await expect(
      releaseFreeSlot(
        { serviceId: 'svc-1', professionalId: 'pro-x', startAt: soon, discounts: DISCOUNTS },
        OWNER,
        'prov-1',
        NOW,
      ),
    ).rejects.toBeInstanceOf(SlotOfferServiceInvalidError);
  });

  it('no deja liberar servicios de otro negocio', async () => {
    repo.findServiceWithOwner.mockResolvedValue(service({ providerId: 'prov-2' }));
    await expect(
      releaseFreeSlot(
        { serviceId: 'svc-1', startAt: soon.toISOString(), discounts: DISCOUNTS },
        OWNER,
        'prov-1',
        NOW,
      ),
    ).rejects.toBeInstanceOf(SlotOfferServiceInvalidError);
  });
});

describe('withdrawSlotOffer', () => {
  it('retira la oferta del dueño y es idempotente', async () => {
    repo.findWithOwner.mockResolvedValue({
      id: 'offer-1',
      status: 'active',
      provider: { userId: OWNER },
    });
    await withdrawSlotOffer({ offerId: 'offer-1' }, OWNER, NOW);
    expect(repo.withdraw).toHaveBeenCalledWith('offer-1', NOW);

    repo.withdraw.mockClear();
    repo.findWithOwner.mockResolvedValue({
      id: 'offer-1',
      status: 'withdrawn',
      provider: { userId: OWNER },
    });
    await withdrawSlotOffer({ offerId: 'offer-1' }, OWNER, NOW);
    expect(repo.withdraw).not.toHaveBeenCalled();
  });

  it('no deja retirar ofertas ajenas', async () => {
    repo.findWithOwner.mockResolvedValue({
      id: 'offer-1',
      status: 'active',
      provider: { userId: 'x' },
    });
    await expect(withdrawSlotOffer({ offerId: 'offer-1' }, OWNER, NOW)).rejects.toBeInstanceOf(
      SlotOfferForbiddenError,
    );
  });
});
