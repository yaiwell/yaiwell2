/**
 * Tests del Route Handler `GET /api/search`.
 *
 * Mockeamos el módulo `@/lib/services/search` para validar en aislamiento
 * que el handler:
 *  - Devuelve 400 con código `BAD_REQUEST` para query strings inválidos.
 *  - Llama al servicio correcto (`searchServices` vs `searchProviders`)
 *    con los parámetros parseados.
 *  - Devuelve 200 con el payload `{ results, total, took }`.
 *  - Mapea `SearchValidationError` del servicio a 400.
 *  - Mapea errores no esperados a 500 con código `INTERNAL`.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchValidationError } from '@/lib/services/search';
import type * as SearchModule from '@/lib/services/search';

vi.mock('@/lib/services/search', async () => {
  const actual = await vi.importActual<typeof SearchModule>('@/lib/services/search');
  return {
    ...actual,
    searchServices: vi.fn(),
    searchProviders: vi.fn(),
  };
});

import { searchProviders, searchServices } from '@/lib/services/search';

import { GET } from './route';

const mockedServices = vi.mocked(searchServices);
const mockedProviders = vi.mocked(searchProviders);

function buildRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 400 si falta el parámetro q', async () => {
    const res = await GET(buildRequest('/api/search?type=services'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('devuelve 400 si type no es válido', async () => {
    const res = await GET(buildRequest('/api/search?type=foo&q=masaje'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('devuelve 400 si limit fuera de rango', async () => {
    const res = await GET(buildRequest('/api/search?q=masaje&limit=999'));
    expect(res.status).toBe(400);
  });

  it('llama a searchServices con defaults cuando type=services', async () => {
    mockedServices.mockResolvedValue([]);
    const res = await GET(buildRequest('/api/search?type=services&q=masaje'));
    expect(res.status).toBe(200);
    expect(mockedServices).toHaveBeenCalledWith({
      query: 'masaje',
      language: 'es',
      limit: undefined,
      offset: undefined,
    });
  });

  it('llama a searchProviders cuando type=providers y respeta lang/limit/offset', async () => {
    mockedProviders.mockResolvedValue([]);
    const res = await GET(
      buildRequest('/api/search?type=providers&q=spa&lang=de&limit=5&offset=10'),
    );
    expect(res.status).toBe(200);
    expect(mockedProviders).toHaveBeenCalledWith({
      query: 'spa',
      language: 'de',
      limit: 5,
      offset: 10,
    });
  });

  it('devuelve payload { results, total, took } en éxito', async () => {
    const fakeResults = [
      {
        id: 'svc-1',
        providerId: 'prov-1',
        categoryId: 'cat-1',
        professionalId: null,
        name: { es: 'Masaje', ca: 'Massatge' },
        description: { es: '', ca: '' },
        priceCents: 4500,
        durationMinutes: 60,
        score: 0.42,
      },
    ];
    mockedServices.mockResolvedValue(fakeResults as never);

    const res = await GET(buildRequest('/api/search?q=masaje'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(typeof body.took).toBe('number');
  });

  it('mapea SearchValidationError del servicio a 400', async () => {
    mockedServices.mockRejectedValue(new SearchValidationError('input feo'));
    const res = await GET(buildRequest('/api/search?q=masaje'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('SEARCH_VALIDATION_FAILED');
  });

  it('mapea errores inesperados a 500 con código INTERNAL', async () => {
    mockedServices.mockRejectedValue(new Error('boom'));
    // Silenciamos el console.error que dispara el handler en este caso.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(buildRequest('/api/search?q=masaje'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });
});
