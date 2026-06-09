/**
 * Tests de `geocodeAddress` y `reverseGeocode`.
 *
 * Mockeamos `fetch` global con `vi.stubGlobal` para no salir a red.
 * Cubrimos:
 *  - Query vacío → return [] sin llamar a fetch.
 *  - Falta de token → MapboxConfigError sin llamar a fetch.
 *  - URL forward: incluye q, language, country, limit, proximity, types.
 *  - URL reverse: incluye longitude/latitude.
 *  - Response no-OK → MapboxRequestError con status preservado.
 *  - Parseo: features con name/coords → GeocodingResult; sin → skipped.
 *  - Fallback a `geometry.coordinates` si `properties.coordinates` falta.
 *  - Normalización del `feature_type` desconocido → 'address'.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MapboxConfigError, MapboxRequestError } from './mapbox.errors';
import { geocodeAddress, reverseGeocode } from './mapbox.service';

const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const TEST_TOKEN = 'pk.test_token_abc123';

/**
 * Construye una respuesta `fetch` mockeada con json/ok customizables.
 */
function mockFetchOnce(payload: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('geocodeAddress', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = TEST_TOKEN;
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('devuelve [] sin llamar a fetch cuando query es vacío', async () => {
    const fetchMock = mockFetchOnce({ features: [] });
    const result = await geocodeAddress('   ');
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lanza MapboxConfigError si falta el token', async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const fetchMock = mockFetchOnce({ features: [] });
    await expect(geocodeAddress('Barcelona')).rejects.toBeInstanceOf(MapboxConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('construye la URL con q, language, country, limit y proximity', async () => {
    const fetchMock = mockFetchOnce({ features: [] });

    await geocodeAddress('Plaça Catalunya', {
      language: 'ca',
      country: 'es',
      limit: 3,
      proximity: { lat: 41.39, lng: 2.16 },
      types: ['place', 'address'],
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.mapbox.com/search/geocode/v6/forward');
    expect(url.searchParams.get('q')).toBe('Plaça Catalunya');
    expect(url.searchParams.get('language')).toBe('ca');
    expect(url.searchParams.get('country')).toBe('es');
    expect(url.searchParams.get('limit')).toBe('3');
    expect(url.searchParams.get('access_token')).toBe(TEST_TOKEN);
    // Mapbox espera "lng,lat" — verificamos el orden invertido.
    expect(url.searchParams.get('proximity')).toBe('2.16,41.39');
    expect(url.searchParams.get('types')).toBe('place,address');
  });

  it('lanza MapboxRequestError con el status si la API devuelve no-OK', async () => {
    mockFetchOnce({ message: 'invalid token' }, { ok: false, status: 401 });
    try {
      await geocodeAddress('Barcelona');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(MapboxRequestError);
      const e = err as MapboxRequestError;
      expect(e.status).toBe(401);
      expect(e.code).toBe('MAPBOX_REQUEST_FAILED');
    }
  });

  it('parsea features con name/coords y normaliza feature_type', async () => {
    mockFetchOnce({
      features: [
        {
          id: 'feat_1',
          properties: {
            name: 'Barcelona',
            full_address: 'Barcelona, Catalunya, Spain',
            feature_type: 'place',
            coordinates: { longitude: 2.1734, latitude: 41.3851 },
          },
        },
        {
          // Feature sin name → debe ser descartado.
          id: 'feat_2',
          properties: {
            full_address: 'Algún sitio',
            coordinates: { longitude: 0, latitude: 0 },
          },
        },
        {
          // Feature sin coords → debe ser descartado.
          id: 'feat_3',
          properties: { name: 'Otra cosa' },
        },
      ],
    });

    const result = await geocodeAddress('Barcelona');
    expect(result).toEqual([
      {
        id: 'feat_1',
        name: 'Barcelona',
        fullAddress: 'Barcelona, Catalunya, Spain',
        lat: 41.3851,
        lng: 2.1734,
        kind: 'place',
      },
    ]);
  });

  it('cae a geometry.coordinates si properties.coordinates falta', async () => {
    mockFetchOnce({
      features: [
        {
          id: 'feat_geo',
          geometry: { coordinates: [2.5, 41.5] },
          properties: { name: 'Algún punto', feature_type: 'address' },
        },
      ],
    });

    const result = await geocodeAddress('algún');
    expect(result[0]).toMatchObject({ lat: 41.5, lng: 2.5 });
  });

  it('normaliza feature_type desconocido a "address"', async () => {
    mockFetchOnce({
      features: [
        {
          id: 'feat_x',
          properties: {
            name: 'X',
            feature_type: 'galaxy', // desconocido
            coordinates: { longitude: 0, latitude: 0 },
          },
        },
      ],
    });

    const result = await geocodeAddress('x');
    expect(result[0].kind).toBe('address');
  });

  it('usa mapbox_id como fallback si no hay id top-level', async () => {
    mockFetchOnce({
      features: [
        {
          // sin `id` top-level
          properties: {
            mapbox_id: 'mbx_42',
            name: 'Sant Cugat',
            feature_type: 'place',
            coordinates: { longitude: 2.08, latitude: 41.47 },
          },
        },
      ],
    });

    const result = await geocodeAddress('sant cugat');
    expect(result[0].id).toBe('mbx_42');
  });

  it('cuando full_address falta usa place_formatted', async () => {
    mockFetchOnce({
      features: [
        {
          id: 'feat_pf',
          properties: {
            name: 'Eixample',
            place_formatted: 'Barcelona, Catalunya',
            feature_type: 'neighborhood',
            coordinates: { longitude: 2.16, latitude: 41.39 },
          },
        },
      ],
    });

    const result = await geocodeAddress('eixample');
    expect(result[0].fullAddress).toBe('Barcelona, Catalunya');
  });
});

describe('reverseGeocode', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = TEST_TOKEN;
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    } else {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lanza MapboxConfigError si falta el token', async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    await expect(reverseGeocode({ lat: 41.3851, lng: 2.1734 })).rejects.toBeInstanceOf(
      MapboxConfigError,
    );
  });

  it('construye la URL con longitude/latitude separadas', async () => {
    const fetchMock = mockFetchOnce({ features: [] });

    await reverseGeocode({ lat: 41.3851, lng: 2.1734 }, { language: 'es', limit: 1 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://api.mapbox.com/search/geocode/v6/reverse');
    expect(url.searchParams.get('longitude')).toBe('2.1734');
    expect(url.searchParams.get('latitude')).toBe('41.3851');
    expect(url.searchParams.get('language')).toBe('es');
    expect(url.searchParams.get('limit')).toBe('1');
    expect(url.searchParams.get('access_token')).toBe(TEST_TOKEN);
  });

  it('parsea features con properties.coordinates correctamente', async () => {
    mockFetchOnce({
      features: [
        {
          id: 'feat_rev',
          properties: {
            name: 'Carrer Aragó',
            full_address: 'Carrer Aragó 256, Eixample, Barcelona, Spain',
            feature_type: 'address',
            coordinates: { longitude: 2.1612, latitude: 41.3925 },
          },
        },
      ],
    });

    const result = await reverseGeocode({ lat: 41.39, lng: 2.16 });
    expect(result).toEqual([
      {
        id: 'feat_rev',
        name: 'Carrer Aragó',
        fullAddress: 'Carrer Aragó 256, Eixample, Barcelona, Spain',
        lat: 41.3925,
        lng: 2.1612,
        kind: 'address',
      },
    ]);
  });

  it('lanza MapboxRequestError con el status si la API devuelve no-OK', async () => {
    mockFetchOnce({ message: 'rate limited' }, { ok: false, status: 429 });
    try {
      await reverseGeocode({ lat: 41.39, lng: 2.16 });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(MapboxRequestError);
      expect((err as MapboxRequestError).status).toBe(429);
    }
  });
});
