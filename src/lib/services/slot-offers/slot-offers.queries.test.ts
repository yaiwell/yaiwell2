/**
 * Listados de huecos liberados frente a bloqueos de agenda.
 *
 * Una oferta tapada por un bloqueo no se puede comprar (`createBooking`
 * la rechaza), así que tampoco debe anunciarse en tarjetas, mapa, ficha
 * ni en el filtro «Con descuento».
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findLiveForProviders, findActiveBookingSpans, findSpansForProviders, releasable } =
  vi.hoisted(() => ({
    findLiveForProviders: vi.fn(),
    findActiveBookingSpans: vi.fn(),
    findSpansForProviders: vi.fn(),
    releasable: {
      getCivilDaysInWindow: vi.fn(),
      getServiceDaySlots: vi.fn(),
      findActiveServiceIds: vi.fn(),
      findActiveForProviderRange: vi.fn(),
      findActiveProfessionals: vi.fn(),
    },
  }));

vi.mock('@/lib/services/availability', () => ({
  BUSINESS_TIMEZONE: 'Europe/Madrid',
  getCivilDaysInWindow: releasable.getCivilDaysInWindow,
  getServiceDaySlots: releasable.getServiceDaySlots,
}));
vi.mock('./slot-offers.repository', () => ({
  slotOffersRepository: {
    findLiveForProviders,
    findActiveBookingSpans,
    findActiveServiceIds: releasable.findActiveServiceIds,
    findActiveForProviderRange: releasable.findActiveForProviderRange,
    findActiveProfessionals: releasable.findActiveProfessionals,
  },
}));
vi.mock('@/lib/services/schedule-blocks/schedule-blocks.repository', () => ({
  scheduleBlocksRepository: { findSpansForProviders },
}));

import { getBestOfferByProvider, listReleasableFreeSlots } from './slot-offers.queries';

const NOW = new Date('2026-06-01T08:00:00.000Z');

function offerRow(id: string, providerId: string, startIso: string, endIso: string) {
  return {
    id,
    providerId,
    professionalId: `${providerId}-pro`,
    serviceId: 'svc',
    startAt: new Date(startIso),
    endAt: new Date(endIso),
    expiresAt: new Date(startIso),
    discountPctOver2h: 20,
    discountPct1To2h: 20,
    discountPctUnder1h: 20,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  findActiveBookingSpans.mockResolvedValue([]);
  findSpansForProviders.mockResolvedValue([]);
});

describe('getBestOfferByProvider', () => {
  it('no anuncia una oferta tapada por un bloqueo de agenda', async () => {
    findLiveForProviders.mockResolvedValue([
      offerRow('blocked', 'p1', '2026-06-01T12:00:00.000Z', '2026-06-01T13:00:00.000Z'),
      offerRow('free', 'p2', '2026-06-01T12:00:00.000Z', '2026-06-01T13:00:00.000Z'),
    ]);
    findSpansForProviders.mockResolvedValue([
      {
        professionalId: 'p1-pro',
        startAt: new Date('2026-06-01T11:00:00.000Z'),
        endAt: new Date('2026-06-01T14:00:00.000Z'),
      },
    ]);

    const best = await getBestOfferByProvider(['p1', 'p2'], NOW);

    expect(best.has('p1')).toBe(false);
    expect(best.get('p2')?.offerId).toBe('free');
    expect(findSpansForProviders).toHaveBeenCalledWith(
      ['p1', 'p2'],
      new Date('2026-06-01T12:00:00.000Z'),
      new Date('2026-06-01T13:00:00.000Z'),
    );
  });
});

describe('listReleasableFreeSlots', () => {
  const at = (iso: string) => new Date(iso);
  const slot = (iso: string) => ({
    startAt: at(iso),
    endAt: new Date(at(iso).getTime() + 3_600_000),
  });

  it('devuelve los huecos de cada profesional con su nombre, sin los que ya tienen oferta', async () => {
    releasable.getCivilDaysInWindow.mockReturnValue([at('2026-06-01T00:00:00.000Z')]);
    releasable.findActiveServiceIds.mockResolvedValue(['svc-1']);
    releasable.findActiveProfessionals.mockResolvedValue([
      { id: 'pro-1', name: 'Ana' },
      { id: 'pro-2', name: 'Bea' },
    ]);
    // Ana ya liberó las 09:00Z: solo queda el hueco de Bea a esa hora.
    releasable.findActiveForProviderRange.mockResolvedValue([
      {
        professionalId: 'pro-1',
        startAt: at('2026-06-01T09:00:00.000Z'),
        endAt: at('2026-06-01T10:00:00.000Z'),
      },
    ]);
    releasable.getServiceDaySlots.mockResolvedValue({
      slotsByProfessional: new Map([
        ['pro-1', [slot('2026-06-01T09:00:00.000Z')]],
        ['pro-2', [slot('2026-06-01T09:00:00.000Z'), slot('2026-06-01T12:00:00.000Z')]],
      ]),
    });

    const result = await listReleasableFreeSlots('prov-1', NOW);

    // 12:00Z queda fuera de la ventana de 2 h.
    expect(result).toEqual([
      {
        serviceId: 'svc-1',
        startAtIso: '2026-06-01T09:00:00.000Z',
        endAtIso: '2026-06-01T10:00:00.000Z',
        professionalId: 'pro-2',
        professionalName: 'Bea',
      },
    ]);
  });
});
