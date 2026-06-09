/**
 * Tests del resolver `userId → providerId`.
 *
 * Mockeamos:
 *  - `@clerk/nextjs/server` (auth) para controlar el clerkId resuelto.
 *  - `@/lib/db/prisma` para devolver rows de `user` y `provider` sin BD.
 *  - `@/i18n/navigation` para capturar las llamadas a `redirect` sin
 *    que el test rompa por la excepción interna de Next.
 *  - `./guard` (`requireRole`) para aislar `requireCurrentProvider`
 *    del flujo de sesión/claims (ya cubierto en `guard.test.ts`).
 *
 * Cubrimos:
 *  - Sin sesión → null en getter / redirect a /entrar en require.
 *  - Sesión sin user en BD → null en getter / redirect a onboarding.
 *  - Sesión + user sin Provider → null en getter / redirect a onboarding.
 *  - Sesión + user + Provider → devuelve datos esperados.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { authMock, redirectMock, requireRoleMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((args: { href: string; locale: string }) => {
    const err = new Error(`REDIRECT:${args.href}`);
    (err as { __redirect?: { href: string; locale: string } }).__redirect = args;
    throw err;
  }),
  requireRoleMock: vi.fn(async () => ({ userId: 'user_clerk_1', role: 'provider' as const })),
  prismaMock: {
    user: { findUnique: vi.fn() },
    provider: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: authMock,
}));

vi.mock('@/i18n/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('./guard', () => ({
  requireRole: requireRoleMock,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

import { getCurrentProviderId, requireCurrentProvider } from './provider';

async function captureRedirect(promise: Promise<unknown>) {
  try {
    await promise;
    return null;
  } catch (err) {
    return (err as { __redirect?: { href: string; locale: string } }).__redirect ?? null;
  }
}

describe('getCurrentProviderId', () => {
  beforeEach(() => {
    authMock.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.provider.findFirst.mockReset();
  });

  it('devuelve null sin sesión', async () => {
    authMock.mockResolvedValue({ userId: null });

    await expect(getCurrentProviderId()).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('devuelve null si el user aún no se ha sincronizado en BD', async () => {
    authMock.mockResolvedValue({ userId: 'user_clerk_x' });
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(getCurrentProviderId()).resolves.toBeNull();
    expect(prismaMock.provider.findFirst).not.toHaveBeenCalled();
  });

  it('devuelve null si el user no tiene Provider asociado', async () => {
    authMock.mockResolvedValue({ userId: 'user_clerk_1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaMock.provider.findFirst.mockResolvedValue(null);

    await expect(getCurrentProviderId()).resolves.toBeNull();
  });

  it('devuelve el providerId cuando todo está enlazado', async () => {
    authMock.mockResolvedValue({ userId: 'user_clerk_1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaMock.provider.findFirst.mockResolvedValue({ id: 'prov-1' });

    await expect(getCurrentProviderId()).resolves.toBe('prov-1');
  });
});

describe('requireCurrentProvider', () => {
  beforeEach(() => {
    authMock.mockReset();
    redirectMock.mockClear();
    requireRoleMock.mockClear();
    requireRoleMock.mockResolvedValue({ userId: 'user_clerk_1', role: 'provider' });
    prismaMock.user.findUnique.mockReset();
    prismaMock.provider.findFirst.mockReset();
    prismaMock.provider.findUnique.mockReset();
  });

  it('redirige a /panel/onboarding si no hay Provider asociado', async () => {
    authMock.mockResolvedValue({ userId: 'user_clerk_1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaMock.provider.findFirst.mockResolvedValue(null);

    const dest = await captureRedirect(requireCurrentProvider('es'));

    expect(dest).toEqual({ href: '/panel/onboarding', locale: 'es' });
    expect(requireRoleMock).toHaveBeenCalledWith(['provider'], 'es');
  });

  it('redirige a onboarding si el Provider desaparece entre queries (carrera)', async () => {
    authMock.mockResolvedValue({ userId: 'user_clerk_1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaMock.provider.findFirst.mockResolvedValue({ id: 'prov-1' });
    prismaMock.provider.findUnique.mockResolvedValue(null);

    const dest = await captureRedirect(requireCurrentProvider('ca'));

    expect(dest).toEqual({ href: '/panel/onboarding', locale: 'ca' });
  });

  it('devuelve datos del Provider cuando todo está bien', async () => {
    authMock.mockResolvedValue({ userId: 'user_clerk_1' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prismaMock.provider.findFirst.mockResolvedValue({ id: 'prov-1' });
    prismaMock.provider.findUnique.mockResolvedValue({
      id: 'prov-1',
      businessName: 'Centro Acme',
      verificationStatus: 'approved',
      planId: 'plan-free',
    });

    const result = await requireCurrentProvider('es');

    expect(result).toEqual({
      id: 'prov-1',
      businessName: 'Centro Acme',
      verificationStatus: 'approved',
      planId: 'plan-free',
    });
  });
});
