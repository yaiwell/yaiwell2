/**
 * Tests de `searchProviders` con el texto libre (`?q=`).
 *
 * El repositorio y la disponibilidad se mockean: lo que se verifica aquí
 * es el cableado — que el texto de servicios/categorías del repositorio
 * se usa para filtrar y que NO se filtra hacia la respuesta pública.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Provider } from '@/types/domain';

import type { SearchableProvider } from './providers.types';

const mocks = vi.hoisted(() => ({
  findAllForSearch: vi.fn(),
  getProvidersAvailability: vi.fn(),
  getBestOfferByProvider: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({ prisma: { category: { findUnique: vi.fn() } } }));
vi.mock('@/lib/services/availability', () => ({
  getProvidersAvailability: mocks.getProvidersAvailability,
}));
// Huecos con descuento: sin ofertas salvo que un test diga lo contrario.
vi.mock('@/lib/services/slot-offers', () => ({
  getBestOfferByProvider: mocks.getBestOfferByProvider,
}));
vi.mock('./providers.repository', () => ({
  providersRepository: { findAllForSearch: mocks.findAllForSearch },
}));

import { searchProviders } from './providers.search';

/** Construye un proveedor mínimo con el texto de búsqueda indicado. */
function entry(
  id: string,
  name: string,
  searchText: string,
  overrides: Partial<Provider> = {},
): SearchableProvider {
  const provider: Provider = {
    id,
    slug: id,
    name,
    type: 'centro',
    description: { es: '', ca: '' },
    address: 'Palma',
    location: { lat: 39.57, lng: 2.65 },
    photos: [],
    rating: 4,
    reviewsCount: 1,
    priceRange: '€€',
    categoryIds: [],
    ...overrides,
  };
  return { provider, searchText };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getProvidersAvailability.mockResolvedValue(new Map());
  mocks.getBestOfferByProvider.mockResolvedValue(new Map());
  mocks.findAllForSearch.mockResolvedValue([
    entry('atelier', 'Atelier Norte', 'Corte mujer Peluquería Belleza'),
    entry('casa-mar', 'Casa Mar Massatges', 'Masaje relajante 60 min Masajes Bienestar'),
    entry('born', 'Born Pàdel Club', 'Hora de pista cubierta Pádel Deporte'),
  ]);
});

/** Ids devueltos por la búsqueda, para aserciones legibles. */
async function idsFor(query: string): Promise<string[]> {
  const result = await searchProviders({ query });
  return result.map((p) => p.id);
}

describe('searchProviders — texto libre', () => {
  it('encuentra por nombre de servicio', async () => {
    expect(await idsFor('corte')).toEqual(['atelier']);
  });

  it('ignora tildes en la consulta', async () => {
    expect(await idsFor('padel')).toEqual(['born']);
    expect(await idsFor('peluqueria')).toEqual(['atelier']);
  });

  it('exige todos los términos', async () => {
    expect(await idsFor('masaje relajante')).toEqual(['casa-mar']);
    expect(await idsFor('masaje corte')).toEqual([]);
  });

  it('sin consulta devuelve todos', async () => {
    expect(await searchProviders({})).toHaveLength(3);
  });

  it('no expone el texto de búsqueda interno en la respuesta', async () => {
    const [first] = await searchProviders({ query: 'corte' });
    expect(first).toBeDefined();
    expect(first).not.toHaveProperty('searchText');
    expect(first).not.toHaveProperty('provider');
  });
});

describe('searchProviders — filtro de nota', () => {
  it('un centro sin reseñas no pasa un filtro de nota aunque la caché tenga rating', async () => {
    mocks.findAllForSearch.mockResolvedValue([
      entry('nuevo', 'Centro Nuevo', '', { rating: 4.8, reviewsCount: 0 }),
      entry('vacio', 'Centro Vacío', '', { rating: 0, reviewsCount: 0 }),
      entry('bueno', 'Centro Bueno', '', { rating: 4.5, reviewsCount: 3 }),
      entry('flojo', 'Centro Flojo', '', { rating: 3.2, reviewsCount: 5 }),
    ]);

    const result = await searchProviders({ minRating: 4 });
    expect(result.map((p) => p.id)).toEqual(['bueno']);
  });

  it('sin filtro de nota los centros nuevos sí aparecen', async () => {
    mocks.findAllForSearch.mockResolvedValue([
      entry('nuevo', 'Centro Nuevo', '', { rating: 0, reviewsCount: 0 }),
    ]);

    expect((await searchProviders({})).map((p) => p.id)).toEqual(['nuevo']);
  });
});

describe('searchProviders — orden determinista', () => {
  it('con todos empatados a 0/0 ordena por nombre y luego por id', async () => {
    // El repositorio los entrega desordenados: el service no debe
    // depender de ese orden.
    mocks.findAllForSearch.mockResolvedValue([
      entry('c-2', 'Zafiro', '', { rating: 0, reviewsCount: 0 }),
      entry('b-2', 'Aura', '', { rating: 0, reviewsCount: 0 }),
      entry('b-1', 'Aura', '', { rating: 0, reviewsCount: 0 }),
      entry('a-1', 'Mar', '', { rating: 0, reviewsCount: 0 }),
    ]);

    expect((await searchProviders({})).map((p) => p.id)).toEqual(['b-1', 'b-2', 'a-1', 'c-2']);
  });

  it('pone primero los centros con nota y trata la nota sin reseñas como 0', async () => {
    mocks.findAllForSearch.mockResolvedValue([
      entry('fantasma', 'Alfa', '', { rating: 4.9, reviewsCount: 0 }),
      entry('pocas', 'Beta', '', { rating: 4.5, reviewsCount: 2 }),
      entry('muchas', 'Gamma', '', { rating: 4.5, reviewsCount: 20 }),
    ]);

    expect((await searchProviders({})).map((p) => p.id)).toEqual(['muchas', 'pocas', 'fantasma']);
  });

  it('con ubicación ordena por distancia y desempata por nombre e id', async () => {
    const same = { lat: 39.57, lng: 2.65 };
    mocks.findAllForSearch.mockResolvedValue([
      entry('lejos', 'Alfa', '', { location: { lat: 39.7, lng: 2.65 } }),
      entry('z-2', 'Zeta', '', { location: same }),
      entry('z-1', 'Zeta', '', { location: same }),
      entry('b', 'Beta', '', { location: same }),
    ]);

    const result = await searchProviders({ userLocation: same });
    expect(result.map((p) => p.id)).toEqual(['b', 'z-1', 'z-2', 'lejos']);
  });
});

describe('searchProviders — huecos con descuento', () => {
  const offer = { serviceId: 'svc-1', startAtIso: '2026-10-28T17:00:00.000Z', discountPct: 20 };

  it('anuncia la mejor oferta de cada centro sin reordenar el listado', async () => {
    mocks.getBestOfferByProvider.mockResolvedValue(
      new Map([['born', { offerId: 'o-1', ...offer }]]),
    );

    const result = await searchProviders({});

    expect(result.map((p) => p.id)).toEqual(['atelier', 'born', 'casa-mar']);
    expect(result.find((p) => p.id === 'born')?.bestOffer).toMatchObject(offer);
    expect(result.find((p) => p.id === 'atelier')?.bestOffer).toBeNull();
  });

  it('el filtro «Con descuento» deja solo los centros con oferta vigente', async () => {
    mocks.getBestOfferByProvider.mockResolvedValue(
      new Map([['born', { offerId: 'o-1', ...offer }]]),
    );

    const result = await searchProviders({ discountOnly: true });

    expect(result.map((p) => p.id)).toEqual(['born']);
  });
});
