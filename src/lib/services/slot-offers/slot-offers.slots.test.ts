/**
 * Huecos reservables: ofertas frente a bloqueos de agenda y elección de
 * profesional (CLAUDE.md §4.bis «Equipo»).
 *
 * Una oferta de hueco con descuento que queda bajo un bloqueo no se
 * puede comprar: `isBookableStart` la rechaza y el selector de hora
 * (`getPricedSlotsForService`) no la anuncia. Las horas de la rejilla
 * normal ya llegan filtradas del motor de disponibilidad. Con varios
 * profesionales, una hora es reservable «con cualquiera» si al menos uno
 * puede atenderla, y una oferta de uno de ellos sale con su descuento.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AvailabilityTime from '@/lib/services/availability/availability.time';

const mocks = vi.hoisted(() => ({
  getServiceDaySlots: vi.fn(),
  getLiveOffersForService: vi.fn(),
  findServiceWithOwner: vi.fn(),
  findLiveForServiceStart: vi.fn(),
  hasActiveOverlap: vi.fn(),
  findSpansForProviders: vi.fn(),
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
  getLiveOffersForService: mocks.getLiveOffersForService,
}));
vi.mock('./slot-offers.repository', () => ({
  slotOffersRepository: {
    findServiceWithOwner: mocks.findServiceWithOwner,
    findLiveForServiceStart: mocks.findLiveForServiceStart,
  },
}));
vi.mock('@/lib/services/schedule-blocks/schedule-blocks.repository', () => ({
  scheduleBlocksRepository: {
    hasActiveOverlap: mocks.hasActiveOverlap,
    findSpansForProviders: mocks.findSpansForProviders,
  },
}));

import {
  getBookableCandidates,
  getPricedSlotsForService,
  isBookableStart,
} from './slot-offers.slots';

// 28-oct-2026 en Madrid (CET): el marcador de día es la medianoche UTC.
const DAY = new Date('2026-10-28T00:00:00.000Z');
const NOW = new Date('2026-10-28T10:00:00.000Z');
const OFFER_START = new Date('2026-10-28T11:00:00.000Z');
const OFFER_END = new Date('2026-10-28T12:00:00.000Z');
const OTHER_START = new Date('2026-10-28T13:00:00.000Z');

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

/** Fila de BD de la oferta (lo que devuelve el repositorio). */
const offerRow = {
  ...offer,
  discountPctOver2h: 10,
  discountPct1To2h: 20,
  discountPctUnder1h: 30,
};

/** Rejilla del motor con los candidatos libres de cada hora. */
function engine(byProfessional: Record<string, Date[]>) {
  const slotsByProfessional = new Map<string, { startAt: Date; endAt: Date }[]>();
  const candidatesByStart = new Map<number, string[]>();
  const union = new Map<number, { startAt: Date; endAt: Date }>();
  for (const [id, starts] of Object.entries(byProfessional)) {
    const slots = starts.map((startAt) => ({
      startAt,
      endAt: new Date(startAt.getTime() + 3_600_000),
    }));
    slotsByProfessional.set(id, slots);
    for (const slot of slots) {
      const key = slot.startAt.getTime();
      union.set(key, slot);
      candidatesByStart.set(key, [...(candidatesByStart.get(key) ?? []), id]);
    }
  }
  return {
    providerId: 'prov-1',
    durationMinutes: 60,
    professionalIds: Object.keys(byProfessional),
    slots: [...union.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
    slotsByProfessional,
    candidatesByStart,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServiceDaySlots.mockResolvedValue(engine({ 'pro-1': [] }));
  mocks.getLiveOffersForService.mockResolvedValue([offer]);
  mocks.findServiceWithOwner.mockResolvedValue({ priceCents: 5000 });
  mocks.findLiveForServiceStart.mockResolvedValue([offerRow]);
  mocks.hasActiveOverlap.mockResolvedValue(false);
  mocks.findSpansForProviders.mockResolvedValue([]);
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

  it('por profesional: solo si ESE profesional tiene la hora libre', async () => {
    mocks.findLiveForServiceStart.mockResolvedValue([]);
    mocks.getServiceDaySlots.mockImplementation(
      async (_s: string, _d: Date, _n: Date, professionalId?: string) =>
        professionalId === 'pro-2' ? engine({ 'pro-2': [] }) : engine({ 'pro-1': [OTHER_START] }),
    );

    await expect(isBookableStart('svc-1', 'pro-1', OTHER_START, NOW)).resolves.toBe(true);
    await expect(isBookableStart('svc-1', 'pro-2', OTHER_START, NOW)).resolves.toBe(false);
  });

  it('«cualquiera»: basta con que un candidato tenga la hora', async () => {
    mocks.findLiveForServiceStart.mockResolvedValue([]);
    mocks.getServiceDaySlots.mockResolvedValue(engine({ 'pro-1': [], 'pro-2': [OTHER_START] }));

    await expect(isBookableStart('svc-1', null, OTHER_START, NOW)).resolves.toBe(true);
    await expect(isBookableStart('svc-1', null, OFFER_START, NOW)).resolves.toBe(false);
  });

  it('un profesional que no presta el servicio no puede reservar', async () => {
    mocks.getServiceDaySlots.mockRejectedValue(new Error('PROFESSIONAL_NOT_FOR_SERVICE'));

    await expect(isBookableStart('svc-1', 'pro-x', OFFER_START, NOW)).resolves.toBe(false);
  });
});

describe('getBookableCandidates', () => {
  it('une rejilla y ofertas, en orden de antigüedad, con la oferta de cada uno', async () => {
    mocks.getServiceDaySlots.mockResolvedValue(
      engine({ 'pro-2': [OFFER_START], 'pro-1': [], 'pro-3': [] }),
    );

    const candidates = await getBookableCandidates('svc-1', OFFER_START, NOW);

    expect(candidates).toEqual([
      { professionalId: 'pro-2', offer: null },
      // A 1 h de la hora: tramo de 1-2 h, 20 %.
      { professionalId: 'pro-1', offer: { offerId: 'offer-1', discountPct: 20 } },
    ]);
  });

  it('ignora ofertas de profesionales que ya no prestan el servicio', async () => {
    mocks.getServiceDaySlots.mockResolvedValue(engine({ 'pro-2': [] }));

    await expect(getBookableCandidates('svc-1', OFFER_START, NOW)).resolves.toEqual([]);
  });
});

describe('getPricedSlotsForService', () => {
  it('anuncia la oferta si ningún bloqueo la pisa', async () => {
    const slots = await getPricedSlotsForService('svc-1', DAY, NOW);

    expect(slots).toHaveLength(1);
    expect(slots[0].offer?.offerId).toBe('offer-1');
  });

  it('no anuncia una oferta bajo un bloqueo de agenda de su profesional', async () => {
    mocks.findSpansForProviders.mockResolvedValue([
      {
        professionalId: 'pro-1',
        startAt: new Date('2026-10-28T11:30:00.000Z'),
        endAt: new Date('2026-10-28T15:00:00.000Z'),
      },
    ]);

    await expect(getPricedSlotsForService('svc-1', DAY, NOW)).resolves.toEqual([]);
  });

  it('el bloqueo de OTRO profesional no tapa la oferta', async () => {
    mocks.getServiceDaySlots.mockResolvedValue(engine({ 'pro-1': [], 'pro-2': [] }));
    mocks.findSpansForProviders.mockResolvedValue([
      { professionalId: 'pro-2', startAt: OFFER_START, endAt: OFFER_END },
    ]);

    const slots = await getPricedSlotsForService('svc-1', DAY, NOW);
    expect(slots.map((s) => s.offer?.offerId)).toEqual(['offer-1']);
  });

  it('«cualquiera»: une las horas del equipo y la hora con oferta de A sale rebajada', async () => {
    mocks.getServiceDaySlots.mockResolvedValue(
      engine({ 'pro-1': [], 'pro-2': [OFFER_START, OTHER_START] }),
    );

    const slots = await getPricedSlotsForService('svc-1', DAY, NOW);

    expect(slots.map((s) => s.startAt)).toEqual([OFFER_START, OTHER_START]);
    expect(slots[0].offer).toEqual({
      offerId: 'offer-1',
      discountPct: 20,
      priceCents: 4000,
      originalPriceCents: 5000,
    });
    expect(slots[1].offer).toBeNull();
  });

  it('con profesional elegido, ignora las ofertas de los demás', async () => {
    mocks.getServiceDaySlots.mockResolvedValue(engine({ 'pro-2': [OTHER_START] }));

    const slots = await getPricedSlotsForService('svc-1', DAY, NOW, 'pro-2');

    expect(mocks.getServiceDaySlots).toHaveBeenCalledWith('svc-1', DAY, NOW, 'pro-2');
    expect(slots).toEqual([
      { startAt: OTHER_START, endAt: new Date(OTHER_START.getTime() + 3_600_000), offer: null },
    ]);
  });
});
