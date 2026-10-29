/**
 * Tests de acceso a `/hazte-profesional`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  redirect: vi.fn((args: { href: string }) => {
    throw new Error(`REDIRECT:${args.href}`);
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth, currentUser: mocks.currentUser }));
vi.mock('@/i18n/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn(), getTranslations: vi.fn() }));
vi.mock('@/components/features/onboarding/BecomeProviderConfirm', () => ({
  BecomeProviderConfirm: () => null,
}));
vi.mock('./actions', () => ({ becomeProviderAction: vi.fn() }));

import BecomeProviderPage from './page';

const params = Promise.resolve({ locale: 'es' });

/** Ejecuta la page con unos searchParams dados. */
function render(searchParams: Record<string, string> = {}) {
  return BecomeProviderPage({ params, searchParams: Promise.resolve(searchParams) });
}

describe('BecomeProviderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
  });

  it('sin sesión → /entrar volviendo aquí con el plan', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(render({ plan: 'premium' })).rejects.toThrow(
      `REDIRECT:/entrar?redirect_url=${encodeURIComponent('/hazte-profesional?plan=premium')}`,
    );
  });

  it('cliente → muestra la confirmación con el plan validado', async () => {
    mocks.currentUser.mockResolvedValue({ publicMetadata: { role: 'client' } });
    const element = await render({ plan: 'basic' });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(element.props).toMatchObject({ plan: 'basic' });
  });

  it('plan inválido → confirmación sin plan', async () => {
    mocks.currentUser.mockResolvedValue({ publicMetadata: { role: 'client' } });
    const element = await render({ plan: 'gold' });
    expect(element.props).toMatchObject({ plan: null });
  });

  it('profesional → /onboarding', async () => {
    mocks.currentUser.mockResolvedValue({ publicMetadata: { role: 'provider' } });
    await expect(render()).rejects.toThrow('REDIRECT:/onboarding');
  });

  it('admin → /admin', async () => {
    mocks.currentUser.mockResolvedValue({ publicMetadata: { role: 'admin' } });
    await expect(render()).rejects.toThrow('REDIRECT:/admin');
  });
});
