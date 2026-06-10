/**
 * Tests del Route Handler `PATCH /api/provider-onboarding/photos`.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { authMock, ensureUserMock, updatePhotosMock, MockMissingPrimaryEmailError } = vi.hoisted(
  () => {
    class MockMissingPrimaryEmailError extends Error {
      readonly code = 'MISSING_PRIMARY_EMAIL';
    }
    return {
      authMock: vi.fn(),
      ensureUserMock: vi.fn(),
      updatePhotosMock: vi.fn(),
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
  updateProviderPhotos: updatePhotosMock,
  ProviderForOnboardingNotFoundError: class ProviderForOnboardingNotFoundError extends Error {
    readonly code = 'PROVIDER_FOR_ONBOARDING_NOT_FOUND';
  },
}));

import { ProviderForOnboardingNotFoundError } from '@/lib/services/provider-onboarding';

import { PATCH } from './route';

function buildRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/provider-onboarding/photos', 'http://localhost'), {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('PATCH /api/provider-onboarding/photos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 UNAUTHORIZED sin sesión', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await PATCH(buildRequest({ providerId: 'p1', photos: [] }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 401 USER_NOT_SYNCED si el user no existe en BD', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockRejectedValue(new MockMissingPrimaryEmailError());
    const res = await PATCH(buildRequest({ providerId: 'p1', photos: [] }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('USER_NOT_SYNCED');
  });

  it('devuelve 400 INVALID_BODY si falta providerId', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    const res = await PATCH(buildRequest({ photos: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
  });

  it('llama al servicio con providerId, { photos } y userId; responde 204', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    updatePhotosMock.mockResolvedValue(undefined);

    const photos = ['https://cdn/1.jpg', 'https://cdn/2.jpg'];
    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', photos }));

    expect(res.status).toBe(204);
    expect(updatePhotosMock).toHaveBeenCalledWith('prov-xyz', { photos }, 'user-abc');
  });

  it('mapea ZodError del servicio (photos inválidas) a 400 INVALID_BODY', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    const issues: z.ZodIssue[] = [
      { code: 'custom', path: ['photos'], message: 'Demasiadas fotos' },
    ];
    updatePhotosMock.mockRejectedValue(new z.ZodError(issues));

    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', photos: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
  });

  it('mapea ProviderForOnboardingNotFoundError a 404', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    updatePhotosMock.mockRejectedValue(new ProviderForOnboardingNotFoundError('nope'));

    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', photos: [] }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('PROVIDER_FOR_ONBOARDING_NOT_FOUND');
  });

  it('mapea cualquier otro error a 500 INTERNAL', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    updatePhotosMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', photos: [] }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });
});
