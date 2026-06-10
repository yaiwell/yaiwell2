/**
 * Tests del Route Handler `PATCH /api/provider-onboarding/plan`.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, ensureUserMock, selectPlanMock, MockMissingPrimaryEmailError } = vi.hoisted(
  () => {
    class MockMissingPrimaryEmailError extends Error {
      readonly code = 'MISSING_PRIMARY_EMAIL';
    }
    return {
      authMock: vi.fn(),
      ensureUserMock: vi.fn(),
      selectPlanMock: vi.fn(),
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
  selectPlan: selectPlanMock,
  ProviderForOnboardingNotFoundError: class ProviderForOnboardingNotFoundError extends Error {
    readonly code = 'PROVIDER_FOR_ONBOARDING_NOT_FOUND';
  },
  PlanTierNotFoundError: class PlanTierNotFoundError extends Error {
    readonly code = 'PLAN_TIER_NOT_FOUND';
  },
}));

import {
  PlanTierNotFoundError,
  ProviderForOnboardingNotFoundError,
} from '@/lib/services/provider-onboarding';

import { PATCH } from './route';

function buildRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/provider-onboarding/plan', 'http://localhost'), {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('PATCH /api/provider-onboarding/plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 UNAUTHORIZED sin sesión', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await PATCH(buildRequest({ providerId: 'p1', planTier: 'free' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 401 USER_NOT_SYNCED si el user no está sincronizado', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockRejectedValue(new MockMissingPrimaryEmailError());
    const res = await PATCH(buildRequest({ providerId: 'p1', planTier: 'free' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('USER_NOT_SYNCED');
  });

  it('devuelve 400 INVALID_BODY si planTier no es válido', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    const res = await PATCH(buildRequest({ providerId: 'p1', planTier: 'enterprise' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_BODY');
  });

  it('devuelve 400 INVALID_BODY si falta providerId', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    const res = await PATCH(buildRequest({ planTier: 'pro' }));
    expect(res.status).toBe(400);
  });

  it('llama al servicio con providerId, { planTier } y userId; responde 204', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    selectPlanMock.mockResolvedValue(undefined);

    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', planTier: 'pro' }));
    expect(res.status).toBe(204);
    expect(selectPlanMock).toHaveBeenCalledWith('prov-xyz', { planTier: 'pro' }, 'user-abc');
  });

  it('mapea ProviderForOnboardingNotFoundError a 404', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    selectPlanMock.mockRejectedValue(new ProviderForOnboardingNotFoundError('nope'));

    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', planTier: 'free' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('PROVIDER_FOR_ONBOARDING_NOT_FOUND');
  });

  it('mapea PlanTierNotFoundError a 422', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    selectPlanMock.mockRejectedValue(new PlanTierNotFoundError('no plan in DB'));

    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', planTier: 'free' }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('PLAN_TIER_NOT_FOUND');
  });

  it('mapea cualquier otro error a 500 INTERNAL', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    ensureUserMock.mockResolvedValue({ id: 'user-abc' });
    selectPlanMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await PATCH(buildRequest({ providerId: 'prov-xyz', planTier: 'free' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });
});
