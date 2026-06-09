/**
 * Tests del Route Handler `GET /api/suggestions`.
 *
 * Mockeamos el módulo `@/lib/services/suggestions` para validar en
 * aislamiento que el handler:
 *  - Devuelve 400 con código `BAD_REQUEST` para query strings inválidos.
 *  - Llama a `getSuggestions` con los parámetros parseados.
 *  - Devuelve 200 con el payload `{ results, took }`.
 *  - Mapea `SuggestionsValidationError` del servicio a 400.
 *  - Mapea errores no esperados a 500 con código `INTERNAL`.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SuggestionsValidationError } from '@/lib/services/suggestions';
import type * as SuggestionsModule from '@/lib/services/suggestions';

vi.mock('@/lib/services/suggestions', async () => {
  const actual = await vi.importActual<typeof SuggestionsModule>('@/lib/services/suggestions');
  return {
    ...actual,
    getSuggestions: vi.fn(),
  };
});

import { getSuggestions } from '@/lib/services/suggestions';

import { GET } from './route';

const mockedGet = vi.mocked(getSuggestions);

function buildRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'));
}

describe('GET /api/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 400 si falta el parámetro q', async () => {
    const res = await GET(buildRequest('/api/suggestions'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('devuelve 400 si lang no es válido', async () => {
    const res = await GET(buildRequest('/api/suggestions?q=masaje&lang=fr'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it('llama a getSuggestions con default es cuando no hay lang', async () => {
    mockedGet.mockResolvedValue([]);
    const res = await GET(buildRequest('/api/suggestions?q=masaje'));
    expect(res.status).toBe(200);
    expect(mockedGet).toHaveBeenCalledWith('masaje', 'es');
  });

  it('respeta el lang válido cuando llega en la URL', async () => {
    mockedGet.mockResolvedValue([]);
    const res = await GET(buildRequest('/api/suggestions?q=spa&lang=de'));
    expect(res.status).toBe(200);
    expect(mockedGet).toHaveBeenCalledWith('spa', 'de');
  });

  it('devuelve payload { results, took } en éxito', async () => {
    const fakeResults = [
      {
        type: 'category' as const,
        id: 'cat-1',
        label: 'Masajes',
        slug: 'masajes',
        matchRange: [0, 6] as [number, number],
      },
    ];
    mockedGet.mockResolvedValue(fakeResults);

    const res = await GET(buildRequest('/api/suggestions?q=masaje'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].id).toBe('cat-1');
    expect(typeof body.took).toBe('number');
  });

  it('mapea SuggestionsValidationError del servicio a 400', async () => {
    mockedGet.mockRejectedValue(new SuggestionsValidationError('input feo'));
    const res = await GET(buildRequest('/api/suggestions?q=masaje'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('SUGGESTIONS_VALIDATION_FAILED');
  });

  it('mapea errores inesperados a 500 con código INTERNAL', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));
    // Silenciamos el console.error que dispara el handler en este caso.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(buildRequest('/api/suggestions?q=masaje'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });
});
