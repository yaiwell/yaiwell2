/**
 * Huecos reservables frente a bloqueos de agenda.
 *
 * Una oferta de hueco con descuento que queda bajo un bloqueo no se
 * puede comprar: `isBookableStart` la rechaza y el selector de hora
 * (`getPricedSlotsForService`) no la anuncia. Las horas de la rejilla
 * normal ya llegan filtradas del motor de disponibilidad.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AvailabilityTime from '@/lib/services/availability/availability.time';

const mocks = vi.hoisted(() => ({
  getServiceDaySlots: vi.fn(),
  findLiveOfferForSlot: vi.fn(),
  getLiveOffersForService: vi.fn(),
  findServiceWithOwner: vi.fn(),
  hasActiveOverlap: vi.fn(),
  findSpansForProfessional: vi.fn(),
}));

vi.mock('@/lib/services/availability', async () => {
  const time = await vi.importActual<typeof AvailabilityTime>(
    '@/lib/services/availability/availability.time',
  );
  return {
    BUSINESS_TIMEZONE: 'Europe/Madrid',
    getCivilDayUtc: time.getCivilDayUtc,
    getServiceDaySlots: mocks.getServiceDaySlots,
  };
});
vi.mock('./slot-offers.queries', () => ({
  findLiveOfferForSlot: mocks.findLiveOfferForSlot,
  getLiveOffersForService: mocks.getLiveOffersForService,
}));
vi.mock('./slot-offers.repository', () => ({
  slotOffersRepository: { findServiceWithOwner: mocks.findServiceWithOwner },
}));
vi.mock('@/lib/services/schedule-blocks/schedule-blocks.repository', () => ({
  scheduleBlocksRepository: {
    hasActiveOverlap: mocks.hasActiveOverlap,
    findSpansForProfessional: mocks.findSpansForProfessional,
  },
}));

import { getPricedSlotsForService, isBookableStart } from './slot-offers.slots';

// 28-oct-2026 en Madrid (CET): el marcador de día es la medianoche UTC.
const DAY = new Date('2026-10-28T00:00:00.000Z');
const NOW = new Date('2026-10-28T10:00:00.000Z');
const OFFER_START = new Date('2026-10-28T11:00:00.000Z');
const OFFER_END = new Date('2026-10-28T12:00:00.000Z');

const offer = {
  id: 'offer-1',
  providerId: 'prov-1',
  professionalId: 'pro-1',
  serviceId: 'svc-1',
  startAt: OFFER_START,
  endAt: OFFER_END,
  expiresAt: new Date('2026-10-28T10:30:00.000Z'),
  discounts: { over2h: 10, oneToTwoHours: 20, underOneHour: 30 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServiceDaySlots.mockResolvedValue({
    professionalId: 'pro-1',
    durationMinutes: 60,
    slots: [],
  });
  mocks.findLiveOfferForSlot.mockResolvedValue(offer);
  mocks.getLiveOffersForService.mockResolvedValue([offer]);
  mocks.findServiceWithOwner.mockResolvedValue({ priceCents: 5000 });
  mocks.hasActiveOverlap.mockResolvedValue(false);
  mocks.findSpansForProfessional.mockResolvedValue([]);
});

describe('isBookableStart', () => {
  it('una oferta vigente sin bloqueo es reservable', async () => {
    await expect(isBookableStart('svc-1', 'pro-1', OFFER_START, NOW)).resolves.toBe(true);
  });

  it('una oferta bajo un bloqueo de agenda no es reservable', async () => {
    mocks.hasActiveOverlap.mockResolvedValue(true);

    await expect(isBookableStart('svc-1', 'pro-1', OFFER_START, NOW)).resolves.toBe(false);
    expect(mocks.hasActiveOverlap).toHaveBeenCalledWith('pro-1', OFFER_START, OFFER_END);
  });
});

describe('getPricedSlotsForService', () => {
  it('anuncia la oferta si ningún bloqueo la pisa', async () => {
    const slots = await getPricedSlotsForService('svc-1', DAY, NOW);

    expect(slots).toHaveLength(1);
    expect(slots[0].offer?.offerId).toBe('offer-1');
  });

  it('no anuncia una oferta bajo un bloqueo de agenda', async () => {
    mocks.findSpansForProfessional.mockResolvedValue([
      {
        startAt: new Date('2026-10-28T11:30:00.000Z'),
        endAt: new Date('2026-10-28T15:00:00.000Z'),
      },
    ]);

    await expect(getPricedSlotsForService('svc-1', DAY, NOW)).resolves.toEqual([]);
  });
});
