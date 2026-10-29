/**
 * Tests de la redirección de `/registro` cuando ya hay sesión.
 *
 * Un cliente que pulsa un CTA de `/profesionales` (`?as=provider`) no
 * puede darse de alta otra vez: va a la pantalla que convierte su cuenta.
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
vi.mock('@/components/features/auth/SignUpForm', () => ({ SignUpForm: () => null }));

import SignUpPage from './page';

const params = Promise.resolve({ locale: 'es' });

/** Ejecuta la page con unos searchParams dados. */
function render(searchParams: Record<string, string>) {
  return SignUpPage({ params, searchParams: Promise.resolve(searchParams) });
}

describe('SignUpPage con sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
    mocks.currentUser.mockResolvedValue({ publicMetadata: { role: 'client' } });
  });

  it('cliente con ?as=provider&plan=pro → /hazte-profesional?plan=pro', async () => {
    await expect(render({ as: 'provider', plan: 'pro' })).rejects.toThrow(
      'REDIRECT:/hazte-profesional?plan=pro',
    );
  });

  it('cliente con ?as=provider y plan inválido → /hazte-profesional sin plan', async () => {
    await expect(render({ as: 'provider', plan: 'gold' })).rejects.toThrow(
      /^REDIRECT:\/hazte-profesional$/,
    );
  });

  it('cliente sin intención de profesional → portada', async () => {
    await expect(render({})).rejects.toThrow(/^REDIRECT:\/$/);
  });

  it('profesional con ?as=provider → su panel', async () => {
    mocks.currentUser.mockResolvedValue({ publicMetadata: { role: 'provider' } });
    await expect(render({ as: 'provider' })).rejects.toThrow('REDIRECT:/panel');
  });

  it('sin sesión muestra el formulario', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    const element = await render({ as: 'provider', plan: 'pro' });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(element).toBeTruthy();
  });
});
