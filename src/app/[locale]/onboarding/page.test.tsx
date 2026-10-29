/**
 * Tests del acceso a `/onboarding` por rol.
 *
 * Antes un cliente acababa en la portada sin forma de crear su negocio;
 * ahora va a `/hazte-profesional`. El rol se lee de `currentUser()`
 * (no de los claims) para no rebotar a quien acaba de convertirse.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  redirect: vi.fn((args: { href: string }) => {
    throw new Error(`REDIRECT:${args.href}`);
  }),
  ensureUserFromClerk: vi.fn(),
  loadOnboardingState: vi.fn(),
  listPublicPlans: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth, currentUser: mocks.currentUser }));
vi.mock('@/i18n/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn(), getTranslations: vi.fn() }));
vi.mock('@/components/features/onboarding/OnboardingWizard', () => ({
  OnboardingWizard: () => null,
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: { category: { findMany: mocks.findMany } } }));
vi.mock('@/lib/services/plans', () => ({
  isPlanTierId: (v: unknown) => v === 'free' || v === 'basic' || v === 'pro' || v === 'premium',
  listPublicPlans: mocks.listPublicPlans,
  PlansNotSeededError: class extends Error {},
}));
vi.mock('@/lib/services/provider-onboarding', () => ({
  loadOnboardingState: mocks.loadOnboardingState,
}));
vi.mock('@/lib/services/user', () => ({
  ensureUserFromClerk: mocks.ensureUserFromClerk,
  MissingPrimaryEmailError: class extends Error {},
}));

import OnboardingPage from './page';

const params = Promise.resolve({ locale: 'es' });

/** Usuario de Clerk con el rol dado en `publicMetadata`. */
function userWithRole(role: string) {
  return { publicMetadata: { role }, unsafeMetadata: {} };
}

describe('OnboardingPage (acceso por rol)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
  });

  it('sin sesión → /entrar', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(OnboardingPage({ params })).rejects.toThrow('REDIRECT:/entrar');
  });

  it('cliente → /hazte-profesional', async () => {
    mocks.currentUser.mockResolvedValue(userWithRole('client'));
    await expect(OnboardingPage({ params })).rejects.toThrow('REDIRECT:/hazte-profesional');
    expect(mocks.ensureUserFromClerk).not.toHaveBeenCalled();
  });

  it('admin → /admin', async () => {
    mocks.currentUser.mockResolvedValue(userWithRole('admin'));
    await expect(OnboardingPage({ params })).rejects.toThrow('REDIRECT:/admin');
  });

  it('profesional → wizard con su estado y el plan elegido', async () => {
    mocks.currentUser.mockResolvedValue({
      publicMetadata: { role: 'provider' },
      unsafeMetadata: { selectedPlan: 'pro' },
    });
    mocks.ensureUserFromClerk.mockResolvedValue({ id: 'db_1' });
    mocks.loadOnboardingState.mockResolvedValue({
      providerId: null,
      step: 1,
      hasPhotos: false,
      hasFirstService: false,
      planTier: null,
    });
    mocks.findMany.mockResolvedValue([]);
    mocks.listPublicPlans.mockResolvedValue([{ tier: 'free' }, { tier: 'pro' }]);

    const element = await OnboardingPage({ params });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(element.props).toMatchObject({
      userPending: false,
      initialPlan: 'pro',
      locale: 'es',
      initialState: { step: 1, providerId: null },
    });
  });
});
