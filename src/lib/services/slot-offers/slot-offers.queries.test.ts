/**
 * Listados de huecos liberados frente a bloqueos de agenda.
 *
 * Una oferta tapada por un bloqueo no se puede comprar (`createBooking`
 * la rechaza), así que tampoco debe anunciarse en tarjetas, mapa, ficha
 * ni en el filtro «Con descuento».
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findLiveForProviders, findActiveBookingSpans, findSpansForProviders } = vi.hoisted(() => ({
  findLiveForProviders: vi.fn(),
  findActiveBookingSpans: vi.fn(),
  findSpansForProviders: vi.fn(),
}));

vi.mock('@/lib/services/availability', () => ({
  BUSINESS_TIMEZONE: 'Europe/Madrid',
  getCivilDaysInWindow: vi.fn(),
  getServiceDaySlots: vi.fn(),
}));
vi.mock('./slot-offers.repository', () => ({
  slotOffersRepository: { findLiveForProviders, findActiveBookingSpans },
}));
vi.mock('@/lib/services/schedule-blocks/schedule-blocks.repository', () => ({
  scheduleBlocksRepository: { findSpansForProviders },
}));

import { getBestOfferByProvider } from './slot-offers.queries';

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
