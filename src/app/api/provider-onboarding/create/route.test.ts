/**
 * Tests del Route Handler `POST /api/provider-onboarding/create`.
 *
 * Mockeamos:
 *  - `@clerk/nextjs/server` para controlar la sesión.
 *  - `@/lib/db/prisma` para controlar la resolución clerkId → userId.
 *  - `@/lib/services/provider-onboarding` para no tocar BD ni reglas reales.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { authMock, findUniqueMock, createProviderMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createProviderMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

vi.mock('@/lib/services/provider-onboarding', () => ({
  createProviderFromOnboarding: createProviderMock,
  SlugAlreadyTakenError: class SlugAlreadyTakenError extends Error {
    readonly code = 'SLUG_ALREADY_TAKEN';
  },
  OnboardingAlreadyCompleteError: class OnboardingAlreadyCompleteError extends Error {
    readonly code = 'ONBOARDING_ALREADY_COMPLETE';
  },
  FreePlanNotSeededError: class FreePlanNotSeededError extends Error {
    readonly code = 'FREE_PLAN_NOT_SEEDED';
  },
}));

import {
  FreePlanNotSeededError,
  OnboardingAlreadyCompleteError,
  SlugAlreadyTakenError,
} from '@/lib/services/provider-onboarding';

import { POST } from './route';

function buildRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/provider-onboarding/create', 'http://localhost'), {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/provider-onboarding/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 UNAUTHORIZED si no hay sesión Clerk', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(buildRequest({ businessName: 'Foo' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 401 USER_NOT_SYNCED si el usuario no existe en BD', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue(null);
    const res = await POST(buildRequest({ businessName: 'Foo' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('USER_NOT_SYNCED');
  });

  it('llama al servicio con el userId interno (no el clerkId) y devuelve 200 con providerId', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createProviderMock.mockResolvedValue({ providerId: 'prov-xyz' });

    const input = { businessName: 'Foo', slug: 'foo', type: 'salon' };
    const res = await POST(buildRequest(input));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ providerId: 'prov-xyz' });
    expect(createProviderMock).toHaveBeenCalledWith(input, 'user-abc');
  });

  it('mapea ZodError lanzado por el servicio a 400 INVALID_BODY con issues', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    const issues: z.ZodIssue[] = [{ code: 'custom', path: ['slug'], message: 'Slug requerido' }];
    createProviderMock.mockRejectedValue(new z.ZodError(issues));

    const res = await POST(buildRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
    expect(body.error.issues).toHaveLength(1);
  });

  it('mapea SlugAlreadyTakenError del servicio a 409', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createProviderMock.mockRejectedValue(new SlugAlreadyTakenError('taken'));

    const res = await POST(buildRequest({ slug: 'taken' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('SLUG_ALREADY_TAKEN');
  });

  it('mapea OnboardingAlreadyCompleteError del servicio a 409', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createProviderMock.mockRejectedValue(new OnboardingAlreadyCompleteError('done'));

    const res = await POST(buildRequest({}));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('ONBOARDING_ALREADY_COMPLETE');
  });

  it('mapea FreePlanNotSeededError del servicio a 500', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createProviderMock.mockRejectedValue(new FreePlanNotSeededError('no plan'));

    const res = await POST(buildRequest({}));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('FREE_PLAN_NOT_SEEDED');
  });

  it('mapea cualquier otro error a 500 INTERNAL', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    createProviderMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(buildRequest({}));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });

  it('devuelve 400 INVALID_BODY si el body no es JSON válido', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });

    const req = new NextRequest(new URL('/api/provider-onboarding/create', 'http://localhost'), {
      method: 'POST',
      body: 'not-json{',
      headers: { 'content-type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
  });
});
