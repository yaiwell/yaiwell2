/**
 * Tests del Route Handler `GET /api/provider-onboarding/slug-availability`.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, ensureUserMock, isSlugAvailableMock, MockMissingPrimaryEmailError } = vi.hoisted(
  () => {
    class MockMissingPrimaryEmailError extends Error {
      readonly code = 'MISSING_PRIMARY_EMAIL';
    }
    return {
      authMock: vi.fn(),
      ensureUserMock: vi.fn(),
      isSlugAvailableMock: vi.fn(),
      MockMissingPrimaryEmailError,
    };
  },
);

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/services/user', () => ({
  ensureUserFromClerk: ensureUserMock,
  MissingPrimaryEmailError: MockMissingPrimaryEmailError,
}));

vi.mock('@/lib/services/provider-onboarding', () => ({
  isSlugAvailable: isSlugAvailableMock,
}));

import { GET } from './route';

function buildRequest(slug: string | null): NextRequest {
  const url = new URL('/api/provider-onboarding/slug-availability', 'http://localhost');
  if (slug !== null) {
    url.searchParams.set('slug', slug);
  }
  return new NextRequest(url);
}

describe('GET /api/provider-onboarding/slug-availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 UNAUTHORIZED si no hay sesión', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET(buildRequest('mi-centro'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 401 USER_NOT_SYNCED si el usuario no está sincronizado', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockRejectedValue(new MockMissingPrimaryEmailError());
    const res = await GET(buildRequest('mi-centro'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('USER_NOT_SYNCED');
  });

  it('devuelve 400 si el slug está vacío o ausente', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    const res = await GET(buildRequest(null));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
  });

  it('devuelve 400 si el slug tiene caracteres no permitidos', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    const res = await GET(buildRequest('Foo Bar!'));
    expect(res.status).toBe(400);
  });

  it('devuelve 400 si el slug es demasiado corto', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    const res = await GET(buildRequest('ab'));
    expect(res.status).toBe(400);
  });

  it('llama al servicio y devuelve { available: true } en éxito', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    isSlugAvailableMock.mockResolvedValue(true);

    const res = await GET(buildRequest('mi-centro'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ available: true });
    expect(isSlugAvailableMock).toHaveBeenCalledWith('mi-centro');
  });

  it('devuelve { available: false } cuando el servicio reporta el slug como ocupado', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    isSlugAvailableMock.mockResolvedValue(false);

    const res = await GET(buildRequest('mi-centro'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ available: false });
  });

  it('mapea cualquier error inesperado a 500 INTERNAL', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    isSlugAvailableMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(buildRequest('mi-centro'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });
});
