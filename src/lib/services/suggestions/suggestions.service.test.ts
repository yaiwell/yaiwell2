/**
 * Tests del servicio `getSuggestions`.
 *
 * Mockeamos:
 *  - `@/lib/services/search` (búsquedas FTS de servicios y proveedores).
 *  - `./suggestions.repository` (categorías + lookup batched de providers).
 *
 * Así validamos la lógica de mezcla / mapeo / límites sin tocar Postgres.
 * Los tests de integración contra la BD viven aparte.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/search', async () => {
  // Reutilizamos `SearchValidationError` real para que `instanceof` siga
  // funcionando en el servicio bajo test.
  const actual = await vi.importActual<typeof SearchModule>('@/lib/services/search');
  return {
    ...actual,
    searchServices: vi.fn(),
    searchProviders: vi.fn(),
  };
});

vi.mock('./suggestions.repository', () => ({
  suggestionsRepository: {
    findCategoriesMatching: vi.fn(),
    findProvidersByIds: vi.fn(),
  },
}));

import { SearchValidationError, searchProviders, searchServices } from '@/lib/services/search';
import type * as SearchModule from '@/lib/services/search';

import { SuggestionsValidationError } from './suggestions.errors';
import { getSuggestions } from './suggestions.service';
import { suggestionsRepository } from './suggestions.repository';

import type { ProviderSearchResult, ServiceSearchResult } from '@/lib/services/search';

const mockedSearchServices = vi.mocked(searchServices);
const mockedSearchProviders = vi.mocked(searchProviders);
const mockedRepo = vi.mocked(suggestionsRepository, true);

/**
 * Defaults vacíos para evitar boilerplate en cada test: si el test no
 * sobreescribe, las tres fuentes devuelven listas vacías.
 */
function setupEmpty(): void {
  mockedSearchServices.mockResolvedValue([]);
  mockedSearchProviders.mockResolvedValue([]);
  mockedRepo.findCategoriesMatching.mockResolvedValue([]);
  mockedRepo.findProvidersByIds.mockResolvedValue(new Map());
}

function makeServiceResult(overrides: Partial<ServiceSearchResult> = {}): ServiceSearchResult {
  return {
    id: 'svc-1',
    providerId: 'prov-1',
    categoryId: 'cat-1',
    professionalId: null,
    name: { es: 'Masaje relajante', ca: 'Massatge relaxant' },
    description: { es: '', ca: '' },
    priceCents: 4000,
    durationMinutes: 60,
    score: 0.9,
    ...overrides,
  };
}

function makeProviderResult(overrides: Partial<ProviderSearchResult> = {}): ProviderSearchResult {
  return {
    id: 'prov-1',
    slug: 'casa-mar',
    businessName: 'Casa Mar',
    description: { es: '', ca: '' },
    address: 'Carrer Major 1',
    ratingAvg: 4.7,
    ratingCount: 25,
    score: 0.8,
    ...overrides,
  };
}

describe('getSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEmpty();
  });

  it('devuelve lista vacía si el query tiene menos de 2 caracteres', async () => {
    expect(await getSuggestions('', 'es')).toEqual([]);
    expect(await getSuggestions(' ', 'es')).toEqual([]);
    expect(await getSuggestions('a', 'es')).toEqual([]);

    expect(mockedSearchServices).not.toHaveBeenCalled();
    expect(mockedSearchProviders).not.toHaveBeenCalled();
    expect(mockedRepo.findCategoriesMatching).not.toHaveBeenCalled();
  });

  it('lanza las tres consultas en paralelo con el query y locale', async () => {
    await getSuggestions('  masaje  ', 'ca');

    expect(mockedSearchServices).toHaveBeenCalledWith({
      query: 'masaje',
      language: 'ca',
      limit: 3,
    });
    expect(mockedSearchProviders).toHaveBeenCalledWith({
      query: 'masaje',
      language: 'ca',
      limit: 3,
    });
    expect(mockedRepo.findCategoriesMatching).toHaveBeenCalledWith('masaje', 'ca', 2);
  });

  it('combina las tres fuentes en orden categorías → servicios → proveedores', async () => {
    mockedRepo.findCategoriesMatching.mockResolvedValue([
      { id: 'cat-massage', slug: 'masajes', name: { es: 'Masajes', ca: 'Massatges' } },
    ]);
    mockedSearchServices.mockResolvedValue([
      makeServiceResult({ id: 'svc-a', providerId: 'prov-a' }),
    ]);
    mockedSearchProviders.mockResolvedValue([
      makeProviderResult({ id: 'prov-b', slug: 'prov-b-slug', businessName: 'Prov B' }),
    ]);
    mockedRepo.findProvidersByIds.mockResolvedValue(
      new Map([['prov-a', { slug: 'casa-mar', businessName: 'Casa Mar' }]]),
    );

    const out = await getSuggestions('mas', 'es');

    expect(out.map((s) => s.type)).toEqual(['category', 'service', 'provider']);
    expect(out[0]).toMatchObject({ type: 'category', id: 'cat-cat-massage', slug: 'masajes' });
    expect(out[1]).toMatchObject({
      type: 'service',
      id: 'svc-svc-a',
      serviceId: 'svc-a',
      providerId: 'prov-a',
      providerSlug: 'casa-mar',
      sublabel: 'Casa Mar',
    });
    expect(out[2]).toMatchObject({
      type: 'provider',
      id: 'prov-prov-b',
      providerSlug: 'prov-b-slug',
    });
  });

  it('hace un único lookup batched de proveedores para todos los servicios', async () => {
    mockedSearchServices.mockResolvedValue([
      makeServiceResult({ id: 'svc-a', providerId: 'prov-a' }),
      makeServiceResult({ id: 'svc-b', providerId: 'prov-b' }),
      makeServiceResult({ id: 'svc-c', providerId: 'prov-a' }), // duplicado intencional
    ]);
    mockedRepo.findProvidersByIds.mockResolvedValue(
      new Map([
        ['prov-a', { slug: 'a-slug', businessName: 'A' }],
        ['prov-b', { slug: 'b-slug', businessName: 'B' }],
      ]),
    );

    await getSuggestions('mas', 'es');

    expect(mockedRepo.findProvidersByIds).toHaveBeenCalledTimes(1);
    const [ids] = mockedRepo.findProvidersByIds.mock.calls[0]!;
    // Sin duplicados, gracias al `new Set` del servicio.
    expect([...ids].sort()).toEqual(['prov-a', 'prov-b']);
  });

  it('descarta servicios cuyo proveedor no esté en el lookup batched', async () => {
    mockedSearchServices.mockResolvedValue([
      makeServiceResult({ id: 'svc-keep', providerId: 'prov-ok' }),
      makeServiceResult({ id: 'svc-drop', providerId: 'prov-missing' }),
    ]);
    mockedRepo.findProvidersByIds.mockResolvedValue(
      new Map([['prov-ok', { slug: 'ok-slug', businessName: 'OK' }]]),
    );

    const out = await getSuggestions('mas', 'es');

    const serviceIds = out
      .filter((s): s is Extract<typeof s, { type: 'service' }> => s.type === 'service')
      .map((s) => s.serviceId);
    expect(serviceIds).toEqual(['svc-keep']);
  });

  it('respeta el tope total (suma de límites por fuente)', async () => {
    mockedRepo.findCategoriesMatching.mockResolvedValue([
      { id: 'c1', slug: 'c1', name: { es: 'C1', ca: 'C1' } },
      { id: 'c2', slug: 'c2', name: { es: 'C2', ca: 'C2' } },
    ]);
    mockedSearchServices.mockResolvedValue([
      makeServiceResult({ id: 's1', providerId: 'p1' }),
      makeServiceResult({ id: 's2', providerId: 'p1' }),
      makeServiceResult({ id: 's3', providerId: 'p1' }),
    ]);
    mockedSearchProviders.mockResolvedValue([
      makeProviderResult({ id: 'p1' }),
      makeProviderResult({ id: 'p2', slug: 'p2', businessName: 'P2' }),
      makeProviderResult({ id: 'p3', slug: 'p3', businessName: 'P3' }),
    ]);
    mockedRepo.findProvidersByIds.mockResolvedValue(
      new Map([['p1', { slug: 'p1', businessName: 'P1' }]]),
    );

    const out = await getSuggestions('mas', 'es');

    expect(out).toHaveLength(8);
  });

  it('usa el texto en el locale activo para categorías (locale catalán)', async () => {
    mockedRepo.findCategoriesMatching.mockResolvedValue([
      { id: 'cat-hair', slug: 'peluqueria', name: { es: 'Peluquería', ca: 'Perruqueria' } },
    ]);

    const out = await getSuggestions('perr', 'ca');

    expect(out[0]).toMatchObject({ type: 'category', label: 'Perruqueria' });
  });

  it('calcula matchRange relativo al label (insensible a acentos)', async () => {
    mockedRepo.findCategoriesMatching.mockResolvedValue([
      { id: 'cat-aesthetics', slug: 'estetica', name: { es: 'Estética', ca: 'Estètica' } },
    ]);

    const [first] = await getSuggestions('estet', 'es');

    expect(first?.matchRange).toEqual([0, 5]);
    if (first?.matchRange) {
      const slice = first.label.slice(first.matchRange[0], first.matchRange[1]);
      // El label original conserva la tilde, pero los offsets cuadran.
      expect(slice).toBe('Estét');
    }
  });

  it('reempaqueta SearchValidationError como SuggestionsValidationError', async () => {
    mockedSearchServices.mockRejectedValue(new SearchValidationError('input feo'));

    await expect(getSuggestions('foo', 'es')).rejects.toBeInstanceOf(SuggestionsValidationError);
  });

  it('propaga errores no de validación (ej. Postgres caído)', async () => {
    mockedSearchProviders.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(getSuggestions('foo', 'es')).rejects.toThrow('ECONNREFUSED');
  });

  it('no consulta proveedores si no hay servicios matchados', async () => {
    mockedRepo.findCategoriesMatching.mockResolvedValue([
      { id: 'c1', slug: 'c1', name: { es: 'C1', ca: 'C1' } },
    ]);

    await getSuggestions('mas', 'es');

    expect(mockedRepo.findProvidersByIds).toHaveBeenCalledWith([]);
  });
});
