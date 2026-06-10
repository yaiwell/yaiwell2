/**
 * Tests del Route Handler `GET /api/provider-onboarding/state`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, findUniqueMock, loadStateMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  loadStateMock: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

vi.mock('@/lib/services/provider-onboarding', () => ({
  loadOnboardingState: loadStateMock,
}));

import { GET } from './route';

describe('GET /api/provider-onboarding/state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve 401 UNAUTHORIZED sin sesión', async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve 401 USER_NOT_SYNCED si el user no está sincronizado', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('USER_NOT_SYNCED');
  });

  it('llama al servicio con el userId interno y devuelve 200 con el OnboardingState', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    const fakeState = {
      step: 'photos',
      providerId: 'prov-xyz',
      completed: false,
    };
    loadStateMock.mockResolvedValue(fakeState);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(fakeState);
    expect(loadStateMock).toHaveBeenCalledWith('user-abc');
  });

  it('mapea cualquier error inesperado a 500 INTERNAL', async () => {
    authMock.mockResolvedValue({ userId: 'clerk_123' });
    findUniqueMock.mockResolvedValue({ id: 'user-abc' });
    loadStateMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    spy.mockRestore();
  });
});
