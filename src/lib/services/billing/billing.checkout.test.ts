/**
 * Tests del Checkout de planes: qué se vende, cuándo se rechaza y con qué
 * parámetros se crea la sesión; y la confirmación desde la página de vuelta.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  checkout: { sessions: { create: vi.fn(), retrieve: vi.fn(), list: vi.fn(), expire: vi.fn() } },
  subscriptions: { list: vi.fn() },
}));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

const mocks = vi.hoisted(() => ({
  findByProviderId: vi.fn(),
  ensureBillingCustomer: vi.fn(),
  resolvePriceForTier: vi.fn(),
  syncSubscription: vi.fn(),
}));
vi.mock('./billing.repository', () => ({
  billingRepository: { findByProviderId: mocks.findByProviderId },
}));
vi.mock('./billing.customer', () => ({ ensureBillingCustomer: mocks.ensureBillingCustomer }));
vi.mock('./billing.prices', () => ({
  resolvePriceForTier: mocks.resolvePriceForTier,
  tierFromPrice: () => null,
}));
vi.mock('./billing.sync', () => ({ syncSubscription: mocks.syncSubscription }));
const resolveVatMock = vi.hoisted(() => vi.fn());
vi.mock('./billing.tax', () => ({ resolveVatTaxRate: resolveVatMock }));

import { confirmCheckoutSession, createPlanCheckoutSession } from './billing.checkout';
import {
  CheckoutSessionMismatchError,
  PlanNotPurchasableError,
  SubscriptionAlreadyActiveError,
  VatTaxRateNotConfiguredError,
} from './billing.errors';
import { buildBillingRow, buildPrice, CUSTOMER_ID, PROVIDER_ID } from './billing.test-fixtures';

const URLS = {
  successUrl: 'https://yaiwell.app/es/panel/plan?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: 'https://yaiwell.app/es/panel/plan',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T10:00:30Z'));
  mocks.findByProviderId.mockResolvedValue(null);
  mocks.ensureBillingCustomer.mockResolvedValue(CUSTOMER_ID);
  mocks.resolvePriceForTier.mockResolvedValue(buildPrice('pro', 4900));
  resolveVatMock.mockResolvedValue('txr_iva21');
  stripeMock.subscriptions.list.mockResolvedValue({ data: [] });
  stripeMock.checkout.sessions.list.mockResolvedValue({ data: [] });
  stripeMock.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test_1',
    url: 'https://checkout.stripe.com/c/pay/cs_test_1',
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createPlanCheckoutSession', () => {
  it('crea la sesión de suscripción con customer, metadata y facturación', async () => {
    const result = await createPlanCheckoutSession(PROVIDER_ID, 'pro', URLS, 'ca');
    expect(result).toEqual({
      sessionId: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });
    const minute = Math.floor(Date.now() / 60_000);
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: CUSTOMER_ID,
        line_items: [{ price: 'price_pro', quantity: 1 }],
        client_reference_id: PROVIDER_ID,
        metadata: { providerId: PROVIDER_ID, tier: 'pro' },
        subscription_data: {
          metadata: { providerId: PROVIDER_ID, tier: 'pro' },
          default_tax_rates: ['txr_iva21'],
        },
        locale: 'es',
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true },
        customer_update: { name: 'auto', address: 'auto' },
        success_url: URLS.successUrl,
        cancel_url: URLS.cancelUrl,
      }),
      { idempotencyKey: `plan-checkout:${PROVIDER_ID}:pro:ca:${minute}` },
    );
    // Métodos de pago dinámicos: nunca `payment_method_types`.
    const params = stripeMock.checkout.sessions.create.mock.calls[0]?.[0];
    expect(params).not.toHaveProperty('payment_method_types');
  });

  it('no vende si falta el Tax Rate del IVA', async () => {
    resolveVatMock.mockRejectedValue(new VatTaxRateNotConfiguredError());
    await expect(createPlanCheckoutSession(PROVIDER_ID, 'pro', URLS, 'es')).rejects.toBeInstanceOf(
      VatTaxRateNotConfiguredError,
    );
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it.each(['free', 'gold', ''])('rechaza el tier %j sin tocar Stripe', async (tier) => {
    await expect(createPlanCheckoutSession(PROVIDER_ID, tier, URLS, 'es')).rejects.toBeInstanceOf(
      PlanNotPurchasableError,
    );
    expect(mocks.ensureBillingCustomer).not.toHaveBeenCalled();
  });

  it.each(['active', 'past_due'])(
    'rechaza si el espejo dice que hay suscripción %s',
    async (status) => {
      mocks.findByProviderId.mockResolvedValue(
        buildBillingRow({ stripeSubscriptionId: 'sub_1', subscriptionStatus: status }),
      );
      await expect(
        createPlanCheckoutSession(PROVIDER_ID, 'basic', URLS, 'es'),
      ).rejects.toBeInstanceOf(SubscriptionAlreadyActiveError);
      expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
    },
  );

  it('rechaza si Stripe tiene una suscripción viva que el webhook aún no trajo', async () => {
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [
        { id: 'sub_x', status: 'canceled' },
        { id: 'sub_y', status: 'active' },
      ],
    });
    await expect(
      createPlanCheckoutSession(PROVIDER_ID, 'basic', URLS, 'es'),
    ).rejects.toBeInstanceOf(SubscriptionAlreadyActiveError);
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('permite contratar tras una suscripción cancelada', async () => {
    mocks.findByProviderId.mockResolvedValue(
      buildBillingRow({ stripeSubscriptionId: 'sub_old', subscriptionStatus: 'canceled' }),
    );
    stripeMock.subscriptions.list.mockResolvedValue({
      data: [{ id: 'sub_old', status: 'canceled' }],
    });
    await expect(createPlanCheckoutSession(PROVIDER_ID, 'pro', URLS, 'en')).resolves.toMatchObject({
      sessionId: 'cs_test_1',
    });
  });
});

describe('confirmCheckoutSession', () => {
  const completed = {
    id: 'cs_test_1',
    mode: 'subscription',
    status: 'complete',
    subscription: 'sub_1',
    metadata: { providerId: PROVIDER_ID, tier: 'pro' },
  };

  it('sincroniza la suscripción de una sesión completada del negocio', async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue(completed);
    mocks.syncSubscription.mockResolvedValue({ changed: true, providerId: PROVIDER_ID });
    await expect(confirmCheckoutSession('cs_test_1', PROVIDER_ID)).resolves.toEqual({
      changed: true,
      providerId: PROVIDER_ID,
    });
    expect(mocks.syncSubscription).toHaveBeenCalledWith('sub_1');
  });

  it('devuelve null si el pago aún no ha terminado', async () => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({
      ...completed,
      status: 'open',
      subscription: null,
    });
    await expect(confirmCheckoutSession('cs_test_1', PROVIDER_ID)).resolves.toBeNull();
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it.each([
    ['de otro negocio', { metadata: { providerId: 'prov-otro' } }],
    ['de pago único', { mode: 'payment' }],
    ['sin metadata', { metadata: {} }],
  ])('rechaza una sesión %s', async (_label, overrides) => {
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({ ...completed, ...overrides });
    await expect(confirmCheckoutSession('cs_test_1', PROVIDER_ID)).rejects.toBeInstanceOf(
      CheckoutSessionMismatchError,
    );
  });

  it('rechaza un session_id mal formado sin llamar a Stripe', async () => {
    await expect(confirmCheckoutSession('../../x', PROVIDER_ID)).rejects.toBeInstanceOf(
      CheckoutSessionMismatchError,
    );
    expect(stripeMock.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });
});
