/**
 * Tests del Route Handler `GET /api/geocoding/forward`.
 *
 * Mockeamos `@clerk/nextjs/server` para controlar la sesión y
 * `@/lib/integrations/mapbox` para no llamar a la API real.
 *
 * Cubrimos:
 *  - 401 sin sesión.
 *  - 400 si falta `q` o es muy corto.
 *  - 400 si `language` no es un locale soportado.
 *  - Pasa `country='es'` por defecto al wrapper.
 *  - Recompone `proximity` cuando vienen ambas coords.
 *  - Mapea `MapboxConfigError` a 503.
 *  - Mapea `MapboxRequestError` con status 429 a 429.
 *  - Camino feliz devuelve `{ results }`.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MapboxConfigError, MapboxRequestError } from '@/lib/integrations/mapbox';
import type * as MapboxModule from '@/lib/integrations/mapbox';

const { authMock, geocodeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  geocodeMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/integrations/mapbox', async (importActual) => {
  // El mock parcial preserva las clases de error (MapboxConfigError,
  // MapboxRequestError) y solo sustituye la función con red.
  const actual = await importActual<typeof MapboxModule>();
  return {
    ...actual,
    geocodeAddress: geocodeMock,
  };
});

import { GET } from './route';

function buildRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/geocoding/forward', () => {
  beforeEach(() => {
    authMock.mockReset();
    geocodeMock.mockReset();
    authMock.mockResolvedValue({ userId: 'user_1' });
  });

  it('devuelve 401 sin sesión', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET(buildRequest('/api/geocoding/forward?q=Barcelona'));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 400 si falta q', async () => {
    const res = await GET(buildRequest('/api/geocoding/forward'));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_QUERY');
  });

  it('devuelve 400 si q es demasiado corto', async () => {
    const res = await GET(buildRequest('/api/geocoding/forward?q=a'));
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si language no es es/ca/en/de', async () => {
    const res = await GET(buildRequest('/api/geocoding/forward?q=Barcelona&language=fr'));
    expect(res.status).toBe(400);
  });

  it('llama al wrapper con country=es por defecto y limit=5', async () => {
    geocodeMock.mockResolvedValue([]);
    await GET(buildRequest('/api/geocoding/forward?q=Barcelona'));
    expect(geocodeMock).toHaveBeenCalledWith(
      'Barcelona',
      expect.objectContaining({ country: 'es', limit: 5 }),
    );
  });

  it('recompone proximity cuando vienen ambas coordenadas', async () => {
    geocodeMock.mockResolvedValue([]);
    await GET(buildRequest('/api/geocoding/forward?q=Mayor&proximityLat=41.39&proximityLng=2.16'));
    expect(geocodeMock).toHaveBeenCalledWith(
      'Mayor',
      expect.objectContaining({
        proximity: { lat: 41.39, lng: 2.16 },
      }),
    );
  });

  it('mapea MapboxConfigError a 503', async () => {
    geocodeMock.mockRejectedValue(new MapboxConfigError());
    const res = await GET(buildRequest('/api/geocoding/forward?q=Barcelona'));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('MAPBOX_NOT_CONFIGURED');
  });

  it('mapea MapboxRequestError con status 429 a 429', async () => {
    geocodeMock.mockRejectedValue(new MapboxRequestError(429, 'Too many requests'));
    const res = await GET(buildRequest('/api/geocoding/forward?q=Barcelona'));
    expect(res.status).toBe(429);
  });

  it('camino feliz devuelve { results }', async () => {
    const fake = [
      {
        id: 'mb-1',
        name: 'Barcelona',
        fullAddress: 'Barcelona, España',
        lat: 41.39,
        lng: 2.16,
        kind: 'place' as const,
      },
    ];
    geocodeMock.mockResolvedValue(fake);
    const res = await GET(buildRequest('/api/geocoding/forward?q=Barcelona'));
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual(fake);
  });
});
