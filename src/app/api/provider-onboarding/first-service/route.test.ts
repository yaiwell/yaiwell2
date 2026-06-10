/**
 * Tests del Route Handler `POST /api/provider-onboarding/first-service`.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { authMock, findUniqueMock, createFirstServiceMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createFirstServiceMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

vi.mock('@/lib/services/provider-onboarding', () => ({
  createFirstServiceForProvider: createFirstServiceMock,
  ProviderForOnboardingNotFoundError: class ProviderForOnboardingNotFoundError extends Error {
    readonly code = 'PROVIDER_FOR_ONBOARDING_NOT_FOUND';
  },
  CategoryNotFoundError: class CategoryNotFoundError extends Error {
    readonly code = 'CATEGORY_NOT_FOUND';
  },
}));

import {
  CategoryNotFoundError,
  ProviderForOnboardingNotFoundError,
} from '@/lib/services/provider-onboarding';

import { POST } from './route';

function buildRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/provider-onboarding/first-service', 'http://localhost'), {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/provider-onboarding/first-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 UNAUTHORIZED sin sesión', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(buildRequest({ providerId: 'p1' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 401 USER_NOT_SYNCED si el user no está en BD', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue(null);
    const res = await POST(buildRequest({ providerId: 'p1' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('USER_NOT_SYNCED');
  });

  it('devuelve 400 INVALID_BODY si falta providerId', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    const res = await POST(buildRequest({ name: 'Manicura' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
  });

  it('llama al servicio con providerId, body crudo y userId; responde 200 con serviceId', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createFirstServiceMock.mockResolvedValue({ serviceId: 'svc-xyz' });

    const input = {
      providerId: 'prov-xyz',
      name: 'Manicura básica',
      durationMinutes: 45,
      priceCents: 2500,
      categoryId: 'cat-nails',
    };
    const res = await POST(buildRequest(input));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ serviceId: 'svc-xyz' });
    expect(createFirstServiceMock).toHaveBeenCalledWith('prov-xyz', input, 'user-abc');
  });

  it('mapea ZodError del servicio a 400 INVALID_BODY', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    const issues: z.ZodIssue[] = [
      { code: 'custom', path: ['priceCents'], message: 'Precio inválido' },
    ];
    createFirstServiceMock.mockRejectedValue(new z.ZodError(issues));

    const res = await POST(buildRequest({ providerId: 'prov-xyz' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
  });

  it('mapea ProviderForOnboardingNotFoundError a 404', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createFirstServiceMock.mockRejectedValue(new ProviderForOnboardingNotFoundError('nope'));

    const res = await POST(buildRequest({ providerId: 'prov-xyz' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('PROVIDER_FOR_ONBOARDING_NOT_FOUND');
  });

  it('mapea CategoryNotFoundError a 422', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createFirstServiceMock.mockRejectedValue(new CategoryNotFoundError('nope'));

    const res = await POST(buildRequest({ providerId: 'prov-xyz' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('mapea cualquier otro error a 500 INTERNAL', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createFirstServiceMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(buildRequest({ providerId: 'prov-xyz' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });
});
