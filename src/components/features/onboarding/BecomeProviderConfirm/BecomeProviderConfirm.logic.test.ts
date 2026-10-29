import { describe, expect, it, vi } from 'vitest';

// El hook usa Clerk y el router; aquí solo probamos la función pura.
vi.mock('@clerk/nextjs', () => ({ useAuth: vi.fn(), useUser: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ useRouter: vi.fn() }));

import { refreshSessionToken, resolveBecomeProviderNextStep } from './BecomeProviderConfirm.logic';

describe('resolveBecomeProviderNextStep', () => {
  it('cuenta convertida → refresca la sesión y va al onboarding', () => {
    expect(resolveBecomeProviderNextStep({ status: 'converted' }, 'pro')).toEqual({
      kind: 'navigate',
      href: '/onboarding',
      refreshSession: true,
    });
  });

  it('ya era profesional → también al onboarding', () => {
    expect(resolveBecomeProviderNextStep({ status: 'already-provider' }, null)).toMatchObject({
      kind: 'navigate',
      href: '/onboarding',
    });
  });

  it('sesión caducada → a entrar, volviendo aquí con el plan', () => {
    expect(resolveBecomeProviderNextStep({ status: 'unauthenticated' }, 'basic')).toEqual({
      kind: 'navigate',
      href: '/entrar?redirect_url=%2Fhazte-profesional%3Fplan%3Dbasic',
      refreshSession: false,
    });
  });

  it('admin → error explicado', () => {
    expect(resolveBecomeProviderNextStep({ status: 'forbidden' }, null)).toEqual({
      kind: 'error',
      code: 'forbidden',
    });
  });

  it('fallo o entrada inválida → error genérico', () => {
    expect(resolveBecomeProviderNextStep({ status: 'error' }, null)).toEqual({
      kind: 'error',
      code: 'unknown',
    });
    expect(resolveBecomeProviderNextStep({ status: 'invalid-input' }, null)).toEqual({
      kind: 'error',
      code: 'unknown',
    });
  });
});

describe('refreshSessionToken', () => {
  it('a la primera: true y una sola llamada sin caché', async () => {
    const getToken = vi.fn().mockResolvedValue('jwt');
    await expect(refreshSessionToken(getToken)).resolves.toBe(true);
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(getToken).toHaveBeenCalledWith({ skipCache: true });
  });

  it('reintenta una vez si falla o devuelve null', async () => {
    const getToken = vi.fn().mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce('jwt');
    await expect(refreshSessionToken(getToken)).resolves.toBe(true);
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it('tras dos fallos devuelve false (la pantalla avisa en vez de navegar)', async () => {
    const getToken = vi.fn().mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('net'));
    await expect(refreshSessionToken(getToken)).resolves.toBe(false);
    expect(getToken).toHaveBeenCalledTimes(2);
  });
});
