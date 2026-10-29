import { describe, expect, it, vi } from 'vitest';

import { checkoutFailedHref, finalizeOnboarding } from './OnboardingWizard.finalize';

/**
 * Cierre del wizard: el negocio siempre se publica en Gratis y, si el
 * plan elegido es de pago, se abre el Checkout. Si no se puede abrir,
 * se lleva al panel del plan con aviso (el alta ya está hecha).
 */

function deps(overrides: Partial<Parameters<typeof finalizeOnboarding>[1]> = {}) {
  return {
    selectFreePlan: vi.fn(async () => ({ data: {} })),
    startCheckout: vi.fn(async () => ({ ok: true as const, url: 'https://checkout.stripe.com/x' })),
    ...overrides,
  };
}

describe('finalizeOnboarding', () => {
  it('Gratis: publica y va al panel sin tocar Stripe', async () => {
    const d = deps();
    expect(await finalizeOnboarding('free', d)).toEqual({ kind: 'panel', href: '/panel' });
    expect(d.selectFreePlan).toHaveBeenCalledOnce();
    expect(d.startCheckout).not.toHaveBeenCalled();
  });

  it('plan de pago: publica en Gratis y abre el Checkout', async () => {
    const d = deps();
    expect(await finalizeOnboarding('pro', d)).toEqual({
      kind: 'checkout',
      url: 'https://checkout.stripe.com/x',
    });
    expect(d.selectFreePlan).toHaveBeenCalledOnce();
    expect(d.startCheckout).toHaveBeenCalledWith('pro');
  });

  it('si el Checkout falla, va al panel del plan con aviso', async () => {
    const d = deps({
      startCheckout: vi.fn(async () => ({ ok: false as const, code: 'STRIPE_FAILED' as const })),
    });
    expect(await finalizeOnboarding('premium', d)).toEqual({
      kind: 'panel',
      href: '/panel/plan?checkout=failed&plan=premium',
    });
  });

  it('si la action lanza, también va al panel del plan con aviso', async () => {
    const d = deps({ startCheckout: vi.fn(async () => Promise.reject(new Error('network'))) });
    expect(await finalizeOnboarding('basic', d)).toEqual({
      kind: 'panel',
      href: checkoutFailedHref('basic'),
    });
  });

  it('un error al publicar corta antes de Stripe', async () => {
    const d = deps({ selectFreePlan: vi.fn(async () => ({ error: { code: 'INTERNAL' } })) });
    expect(await finalizeOnboarding('pro', d)).toEqual({
      kind: 'error',
      error: { code: 'INTERNAL' },
    });
    expect(d.startCheckout).not.toHaveBeenCalled();
  });

  it('tolera que el alta ya estuviera completa', async () => {
    const d = deps({
      selectFreePlan: vi.fn(async () => ({ error: { code: 'ONBOARDING_ALREADY_COMPLETE' } })),
    });
    expect((await finalizeOnboarding('pro', d)).kind).toBe('checkout');
  });
});
