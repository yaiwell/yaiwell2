import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Aquí no probamos las queries del dominio `slot-offers` sino lo que
 * añade el panel: nombres localizados, hora de Madrid, el profesional de
 * cada hueco y el filtro `?pro=`.
 */
vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    service: { findMany: vi.fn() },
    professional: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/services/slot-offers', () => ({
  getOpenOffersForProviderRange: vi.fn(),
  listReleasableFreeSlots: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { getOpenOffersForProviderRange, listReleasableFreeSlots } from '@/lib/services/slot-offers';

import { getPanelReleasableFreeSlots, getPanelWeekSlotOffers } from './panel-slot-offers.service';

/** Miércoles 14 de enero de 2026, 10:00 UTC (11:00 en Madrid). */
const NOW = new Date('2026-01-14T10:00:00.000Z');

const mockedServices = vi.mocked(prisma.service.findMany);
const mockedProfessionals = vi.mocked(prisma.professional.findMany);
const mockedOffers = vi.mocked(getOpenOffersForProviderRange);
const mockedFreeSlots = vi.mocked(listReleasableFreeSlots);

function freeSlot(professionalId: string, professionalName: string) {
  return {
    serviceId: 'svc-1',
    startAtIso: '2026-01-14T11:00:00.000Z',
    endAtIso: '2026-01-14T11:45:00.000Z',
    professionalId,
    professionalName,
  };
}

function offer(id: string, professionalId: string) {
  return {
    id,
    serviceId: 'svc-1',
    professionalId,
    startAt: new Date('2026-01-15T16:00:00.000Z'),
    endAt: new Date('2026-01-15T16:45:00.000Z'),
    expiresAt: new Date('2026-01-15T15:30:00.000Z'),
    discounts: { over2h: 10, oneToTwoHours: 20, underOneHour: 30 },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedServices.mockResolvedValue([
    { id: 'svc-1', name: { es: 'Corte mujer', ca: 'Tall dona' }, priceCents: 5000 },
  ] as never);
  mockedProfessionals.mockResolvedValue([
    { id: 'pro-ana', name: 'Ana' },
    { id: 'pro-luis', name: 'Luis' },
  ] as never);
});

describe('getPanelReleasableFreeSlots', () => {
  it('trae el profesional de cada hueco (la misma hora sale por cada uno)', async () => {
    mockedFreeSlots.mockResolvedValueOnce([
      freeSlot('pro-ana', 'Ana'),
      freeSlot('pro-luis', 'Luis'),
    ]);

    const slots = await getPanelReleasableFreeSlots('prov-1', 'es', NOW);

    expect(slots).toEqual([
      {
        serviceId: 'svc-1',
        serviceName: 'Corte mujer',
        professionalId: 'pro-ana',
        professionalName: 'Ana',
        startAtIso: '2026-01-14T11:00:00.000Z',
        startTime: '12:00',
        endTime: '12:45',
      },
      expect.objectContaining({ professionalId: 'pro-luis', professionalName: 'Luis' }),
    ]);
  });

  it('con filtro deja solo los huecos de ese profesional', async () => {
    mockedFreeSlots.mockResolvedValueOnce([
      freeSlot('pro-ana', 'Ana'),
      freeSlot('pro-luis', 'Luis'),
    ]);

    const slots = await getPanelReleasableFreeSlots('prov-1', 'es', NOW, 'pro-luis');

    expect(slots.map((s) => s.professionalId)).toEqual(['pro-luis']);
  });
});

describe('getPanelWeekSlotOffers', () => {
  it('expone el profesional de cada oferta y filtra por él', async () => {
    mockedOffers.mockResolvedValue([offer('of-1', 'pro-ana'), offer('of-2', 'pro-luis')] as never);

    const all = await getPanelWeekSlotOffers('prov-1', NOW, 'es', NOW);
    expect(all.map((o) => [o.id, o.professionalId, o.professionalName])).toEqual([
      ['of-1', 'pro-ana', 'Ana'],
      ['of-2', 'pro-luis', 'Luis'],
    ]);

    const onlyAna = await getPanelWeekSlotOffers('prov-1', NOW, 'es', NOW, 'pro-ana');
    expect(onlyAna.map((o) => o.id)).toEqual(['of-1']);
  });
});
