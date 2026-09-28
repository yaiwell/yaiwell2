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
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/prisma', () => ({ prisma: { category: { findUnique: vi.fn() } } }));
vi.mock('@/lib/services/availability', () => ({
  getProvidersAvailability: mocks.getProvidersAvailability,
}));
vi.mock('./providers.repository', () => ({
  providersRepository: { findAllForSearch: mocks.findAllForSearch },
}));

import { searchProviders } from './providers.search';

/** Construye un proveedor mínimo con el texto de búsqueda indicado. */
function entry(id: string, name: string, searchText: string): SearchableProvider {
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
  };
  return { provider, searchText };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getProvidersAvailability.mockResolvedValue(new Map());
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
