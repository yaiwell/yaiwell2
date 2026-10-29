/**
 * Tests de las server actions del plan (`/panel/plan`).
 *
 * Mockeamos auth y el dominio `billing`. Lo que se protege: sin rol de
 * negocio o sin negocio no se llama a Stripe, el Gratis nunca se vende
 * por Checkout, una suscripción viva deriva al portal en vez de abrir un
 * segundo Checkout, y los errores tipados salen como códigos estables.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as BillingValidation from '@/lib/services/billing/billing.validation';

const mocks = vi.hoisted(() => {
  class BillingPlanNotSeededError extends Error {}
  class BillingProviderNotFoundError extends Error {}
  class BillingStripeError extends Error {}
  class PlanNotPurchasableError extends Error {}
  class PlanPriceMismatchError extends Error {}
  class SubscriptionAlreadyActiveError extends Error {}
  class SubscriptionNotFoundError extends Error {}
  class VatTaxRateNotConfiguredError extends Error {}
  class BillingPortalNotConfiguredError extends Error {}
  class PlanChangeNotAllowedError extends Error {}
  return {
    getCurrentRole: vi.fn(),
    getCurrentProviderId: vi.fn(),
    createPlanCheckoutSession: vi.fn(),
    createBillingPortalSession: vi.fn(),
    errors: {
      BillingPlanNotSeededError,
      BillingProviderNotFoundError,
      BillingStripeError,
      PlanNotPurchasableError,
      PlanPriceMismatchError,
      SubscriptionAlreadyActiveError,
      SubscriptionNotFoundError,
      VatTaxRateNotConfiguredError,
      BillingPortalNotConfiguredError,
      PlanChangeNotAllowedError,
    },
  };
});

vi.mock('@/lib/auth/server', () => ({
  getCurrentRole: mocks.getCurrentRole,
  getCurrentProviderId: mocks.getCurrentProviderId,
}));
vi.mock('@/lib/seo/site-url', () => ({ SITE_URL: 'https://yaiwell2.vercel.app' }));
vi.mock('@/lib/services/billing', async () => {
  // Los schemas son los reales: la action no redefine la validación.
  const validation: typeof BillingValidation = await vi.importActual(
    '@/lib/services/billing/billing.validation',
  );
  return {
    ...mocks.errors,
    paidPlanTierSchema: validation.paidPlanTierSchema,
    billingPortalIntentSchema: validation.billingPortalIntentSchema,
    createPlanCheckoutSession: mocks.createPlanCheckoutSession,
    createBillingPortalSession: mocks.createBillingPortalSession,
  };
});

import { openBillingPortalAction, startPlanCheckoutAction } from './actions';

const PROVIDER_ID = 'prov-uuid';
const PLAN_URL = 'https://yaiwell2.vercel.app/es/panel/plan';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.getCurrentRole.mockResolvedValue('provider');
  mocks.getCurrentProviderId.mockResolvedValue(PROVIDER_ID);
  mocks.createPlanCheckoutSession.mockResolvedValue({
    sessionId: 'cs_test_1',
    url: 'https://checkout.stripe.com/c/pay/cs_test_1',
  });
  mocks.createBillingPortalSession.mockResolvedValue('https://billing.stripe.com/p/session/x');
});

describe('startPlanCheckoutAction', () => {
  it('devuelve la URL del Checkout con las URLs de vuelta del panel', async () => {
    const result = await startPlanCheckoutAction('es', 'pro');

    expect(result).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    expect(mocks.createPlanCheckoutSession).toHaveBeenCalledWith(
      PROVIDER_ID,
      'pro',
      {
        successUrl: `${PLAN_URL}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${PLAN_URL}?checkout=cancelled`,
      },
      'es',
    );
  });

  it('sin rol de negocio responde FORBIDDEN sin llamar a Stripe', async () => {
    mocks.getCurrentRole.mockResolvedValue('client');
    expect(await startPlanCheckoutAction('es', 'pro')).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mocks.createPlanCheckoutSession).not.toHaveBeenCalled();
  });

  it('sin negocio responde FORBIDDEN sin llamar a Stripe', async () => {
    mocks.getCurrentProviderId.mockResolvedValue(null);
    expect(await startPlanCheckoutAction('es', 'pro')).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mocks.createPlanCheckoutSession).not.toHaveBeenCalled();
  });

  it.each(['free', 'gold', '', null, { tier: 'pro' }])('rechaza el tier %j', async (tier) => {
    expect(await startPlanCheckoutAction('es', tier)).toEqual({
      ok: false,
      code: 'PLAN_NOT_PURCHASABLE',
    });
    expect(mocks.createPlanCheckoutSession).not.toHaveBeenCalled();
  });

  it('rechaza un locale desconocido', async () => {
    expect(await startPlanCheckoutAction('fr' as never, 'pro')).toEqual({
      ok: false,
      code: 'INVALID_INPUT',
    });
  });

  it('con suscripción viva deriva al portal para confirmar el cambio', async () => {
    mocks.createPlanCheckoutSession.mockRejectedValue(
      new mocks.errors.SubscriptionAlreadyActiveError(),
    );

    const result = await startPlanCheckoutAction('de', 'premium');

    expect(result).toEqual({ ok: true, url: 'https://billing.stripe.com/p/session/x' });
    expect(mocks.createBillingPortalSession).toHaveBeenCalledWith(
      PROVIDER_ID,
      { type: 'subscription_update_confirm', tier: 'premium' },
      'https://yaiwell2.vercel.app/de/panel/plan',
      'de',
    );
  });

  it.each([
    [new mocks.errors.PlanPriceMismatchError(), 'PLAN_UNAVAILABLE'],
    [new mocks.errors.BillingPlanNotSeededError(), 'PLAN_UNAVAILABLE'],
    [new mocks.errors.VatTaxRateNotConfiguredError(), 'PLAN_UNAVAILABLE'],
    [new mocks.errors.BillingPortalNotConfiguredError(), 'PLAN_UNAVAILABLE'],
    [new mocks.errors.PlanChangeNotAllowedError(), 'PLAN_NOT_PURCHASABLE'],
    [new mocks.errors.BillingStripeError(), 'STRIPE_FAILED'],
    [new mocks.errors.BillingProviderNotFoundError(), 'FORBIDDEN'],
    [new mocks.errors.PlanNotPurchasableError(), 'PLAN_NOT_PURCHASABLE'],
    [new Error('boom'), 'INTERNAL'],
  ])('mapea %o a %s', async (error, code) => {
    mocks.createPlanCheckoutSession.mockRejectedValue(error);
    expect(await startPlanCheckoutAction('es', 'basic')).toEqual({ ok: false, code });
  });
});

describe('openBillingPortalAction', () => {
  it.each([
    ['manage', undefined, { type: 'manage' }],
    ['payment_method', undefined, { type: 'payment_method_update' }],
    ['cancel', undefined, { type: 'subscription_cancel' }],
    ['change', 'basic', { type: 'subscription_update_confirm', tier: 'basic' }],
  ])('abre el recorrido %s', async (intent, tier, flow) => {
    const result = await openBillingPortalAction('es', intent, tier);

    expect(result).toEqual({ ok: true, url: 'https://billing.stripe.com/p/session/x' });
    expect(mocks.createBillingPortalSession).toHaveBeenCalledWith(
      PROVIDER_ID,
      flow,
      PLAN_URL,
      'es',
    );
  });

  it('change exige un tier de pago', async () => {
    expect(await openBillingPortalAction('es', 'change', 'free')).toEqual({
      ok: false,
      code: 'PLAN_NOT_PURCHASABLE',
    });
    expect(mocks.createBillingPortalSession).not.toHaveBeenCalled();
  });

  it('rechaza una intención desconocida', async () => {
    expect(await openBillingPortalAction('es', 'refund')).toEqual({
      ok: false,
      code: 'INVALID_INPUT',
    });
  });

  it('sin negocio responde FORBIDDEN', async () => {
    mocks.getCurrentProviderId.mockResolvedValue(null);
    expect(await openBillingPortalAction('es', 'manage')).toEqual({
      ok: false,
      code: 'FORBIDDEN',
    });
    expect(mocks.createBillingPortalSession).not.toHaveBeenCalled();
  });

  it('sin suscripción viva responde SUBSCRIPTION_NOT_FOUND', async () => {
    mocks.createBillingPortalSession.mockRejectedValue(
      new mocks.errors.SubscriptionNotFoundError(),
    );
    expect(await openBillingPortalAction('es', 'cancel')).toEqual({
      ok: false,
      code: 'SUBSCRIPTION_NOT_FOUND',
    });
  });
});
