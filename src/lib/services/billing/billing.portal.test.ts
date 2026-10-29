/**
 * Tests del Customer Portal: cada recorrido genera el `flow_data` correcto
 * y los que exigen suscripción viva la comprueban.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  billingPortal: { sessions: { create: vi.fn() } },
  subscriptions: { retrieve: vi.fn() },
}));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

const mocks = vi.hoisted(() => ({
  findByProviderId: vi.fn(),
  ensureBillingCustomer: vi.fn(),
  resolvePriceForTier: vi.fn(),
}));
vi.mock('./billing.repository', () => ({
  billingRepository: { findByProviderId: mocks.findByProviderId },
}));
vi.mock('./billing.customer', () => ({ ensureBillingCustomer: mocks.ensureBillingCustomer }));
vi.mock('./billing.prices', () => ({
  resolvePriceForTier: mocks.resolvePriceForTier,
  // Basta con el tier de la metadata (el real se prueba en prices.test).
  tierFromPrice: (price: { metadata?: { tier?: string } } | null) => price?.metadata?.tier ?? null,
}));
const resolveConfigMock = vi.hoisted(() => vi.fn());
vi.mock('./billing.portal-config', () => ({ resolvePortalConfiguration: resolveConfigMock }));

import {
  BillingPortalNotConfiguredError,
  PlanChangeNotAllowedError,
  SubscriptionNotFoundError,
} from './billing.errors';
import { createBillingPortalSession } from './billing.portal';
import {
  buildBillingRow,
  buildPrice,
  buildSchedule,
  buildSubscription,
  CUSTOMER_ID,
  PROVIDER_ID,
} from './billing.test-fixtures';

const RETURN_URL = 'https://yaiwell.app/de/panel/plan';
const AFTER = { type: 'redirect', redirect: { return_url: RETURN_URL } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureBillingCustomer.mockResolvedValue(CUSTOMER_ID);
  resolveConfigMock.mockReset();
  resolveConfigMock.mockResolvedValue('bpc_plans');
  mocks.findByProviderId.mockResolvedValue(
    buildBillingRow({ stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active' }),
  );
  mocks.resolvePriceForTier.mockResolvedValue(buildPrice('premium', 9900));
  stripeMock.subscriptions.retrieve.mockResolvedValue(buildSubscription());
  stripeMock.billingPortal.sessions.create.mockResolvedValue({
    url: 'https://billing.stripe.com/p/1',
  });
});

describe('createBillingPortalSession', () => {
  it('manage: portada del portal sin flow_data', async () => {
    const url = await createBillingPortalSession(PROVIDER_ID, { type: 'manage' }, RETURN_URL, 'de');
    expect(url).toBe('https://billing.stripe.com/p/1');
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: CUSTOMER_ID,
      configuration: 'bpc_plans',
      return_url: RETURN_URL,
      locale: 'de',
    });
  });

  it('payment_method_update: no exige suscripción viva (sirve en impago)', async () => {
    mocks.findByProviderId.mockResolvedValue(null);
    await createBillingPortalSession(
      PROVIDER_ID,
      { type: 'payment_method_update' },
      RETURN_URL,
      'es',
    );
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_data: { type: 'payment_method_update', after_completion: AFTER },
      }),
    );
  });

  it('subscription_update_confirm: item actual con el price del tier', async () => {
    await createBillingPortalSession(
      PROVIDER_ID,
      { type: 'subscription_update_confirm', tier: 'premium' },
      RETURN_URL,
      'en',
    );
    expect(mocks.resolvePriceForTier).toHaveBeenCalledWith('premium');
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        flow_data: {
          type: 'subscription_update_confirm',
          subscription_update_confirm: {
            subscription: 'sub_1',
            items: [{ id: 'si_1', price: 'price_premium', quantity: 1 }],
          },
          after_completion: AFTER,
        },
      }),
    );
  });

  it('subscription_cancel: apunta a la suscripción guardada', async () => {
    await createBillingPortalSession(
      PROVIDER_ID,
      { type: 'subscription_cancel' },
      RETURN_URL,
      'ca',
    );
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'es',
        flow_data: {
          type: 'subscription_cancel',
          subscription_cancel: { subscription: 'sub_1' },
          after_completion: AFTER,
        },
      }),
    );
  });

  it.each([
    ['sin fila de facturación', null],
    [
      'con suscripción cancelada',
      buildBillingRow({ stripeSubscriptionId: 'sub_1', subscriptionStatus: 'canceled' }),
    ],
  ])('cambiar o cancelar %s lanza SubscriptionNotFoundError', async (_label, row) => {
    mocks.findByProviderId.mockResolvedValue(row);
    await expect(
      createBillingPortalSession(PROVIDER_ID, { type: 'subscription_cancel' }, RETURN_URL, 'es'),
    ).rejects.toBeInstanceOf(SubscriptionNotFoundError);
    expect(stripeMock.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('rechaza un recorrido con tier inválido (Zod)', async () => {
    await expect(
      createBillingPortalSession(
        PROVIDER_ID,
        { type: 'subscription_update_confirm', tier: 'free' } as never,
        RETURN_URL,
        'es',
      ),
    ).rejects.toThrow();
    expect(stripeMock.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('sin la configuración de planes no abre el portal', async () => {
    resolveConfigMock.mockRejectedValue(new BillingPortalNotConfiguredError());
    await expect(
      createBillingPortalSession(PROVIDER_ID, { type: 'manage' }, RETURN_URL, 'es'),
    ).rejects.toBeInstanceOf(BillingPortalNotConfiguredError);
    expect(stripeMock.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  describe('reglas del cambio de plan (las mismas que la UI)', () => {
    const change = { type: 'subscription_update_confirm', tier: 'premium' } as const;

    it.each([
      ['con un cobro pendiente', 'past_due', () => buildSubscription({ status: 'past_due' })],
      [
        'con un cambio ya programado',
        'scheduled_change',
        () => buildSubscription({ schedule: buildSchedule('price_basic') }),
      ],
      ['al mismo plan', 'same_plan', () => buildSubscription({ tier: 'premium' })],
    ])('rechaza el cambio %s', async (_label, reason, sub) => {
      stripeMock.subscriptions.retrieve.mockResolvedValue(sub());
      const error = await createBillingPortalSession(PROVIDER_ID, change, RETURN_URL, 'es').catch(
        (err: unknown) => err,
      );
      expect(error).toBeInstanceOf(PlanChangeNotAllowedError);
      expect(error).toMatchObject({ reason });
      expect(stripeMock.billingPortal.sessions.create).not.toHaveBeenCalled();
    });

    it('rechaza si el espejo ya tiene un cambio programado', async () => {
      mocks.findByProviderId.mockResolvedValue(
        buildBillingRow({
          stripeSubscriptionId: 'sub_1',
          subscriptionStatus: 'active',
          scheduledPlanId: 'plan-basic',
        }),
      );
      await expect(
        createBillingPortalSession(PROVIDER_ID, change, RETURN_URL, 'es'),
      ).rejects.toMatchObject({ reason: 'scheduled_change' });
    });

    it('cancelar sigue permitido con un cobro pendiente', async () => {
      mocks.findByProviderId.mockResolvedValue(
        buildBillingRow({ stripeSubscriptionId: 'sub_1', subscriptionStatus: 'past_due' }),
      );
      await expect(
        createBillingPortalSession(PROVIDER_ID, { type: 'subscription_cancel' }, RETURN_URL, 'es'),
      ).resolves.toBe('https://billing.stripe.com/p/1');
    });
  });
});
