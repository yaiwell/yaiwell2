/**
 * Tests del Checkout de setup del método de pago de comisiones: sesión
 * `mode: 'setup'` sin `payment_method_types`, método por defecto de las
 * facturas al completarse y propiedad comprobada antes de escribir.
 */
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  retrieveSession: vi.fn(),
  retrieveIntent: vi.fn(),
  updateCustomer: vi.fn(),
  ensureCustomer: vi.fn(),
  findByCustomerId: vi.fn(),
  markReady: vi.fn(),
  settle: vi.fn(),
}));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create: mocks.createSession, retrieve: mocks.retrieveSession } },
    setupIntents: { retrieve: mocks.retrieveIntent },
    customers: { update: mocks.updateCustomer },
  }),
}));
vi.mock('./billing.commission.settle', () => ({ settleCommissionDebt: mocks.settle }));
vi.mock('./billing.customer', () => ({ ensureBillingCustomer: mocks.ensureCustomer }));
vi.mock('./billing.repository', () => ({
  billingRepository: { findByCustomerId: mocks.findByCustomerId },
}));
vi.mock('./billing.commission.repository', () => ({
  commissionRepository: { markPaymentMethodReady: mocks.markReady },
}));

import { BillingStripeError, CheckoutSessionMismatchError } from './billing.errors';
import {
  completeOnsiteSetup,
  confirmOnsiteSetupSession,
  createOnsiteSetupSession,
} from './billing.setup';

const URLS = {
  successUrl: 'https://x/ok?session_id={CHECKOUT_SESSION_ID}',
  cancelUrl: 'https://x/ko',
};
const NOW = new Date('2026-10-30T12:00:00Z');

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_setup1',
    mode: 'setup',
    status: 'complete',
    customer: 'cus_aura',
    setup_intent: 'seti_1',
    metadata: { kind: 'onsite_setup', providerId: 'prov-aura' },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ensureCustomer.mockResolvedValue('cus_aura');
  mocks.createSession.mockResolvedValue({ id: 'cs_test_setup1', url: 'https://checkout/setup' });
  mocks.findByCustomerId.mockResolvedValue({ providerId: 'prov-aura' });
  mocks.retrieveIntent.mockResolvedValue({ status: 'succeeded', payment_method: 'pm_1' });
  mocks.retrieveSession.mockResolvedValue(session());
});

describe('createOnsiteSetupSession', () => {
  it('abre un Checkout de setup en euros con metadata y sin payment_method_types', async () => {
    const result = await createOnsiteSetupSession('prov-aura', URLS, 'ca');

    expect(result).toEqual({ sessionId: 'cs_test_setup1', url: 'https://checkout/setup' });
    const [params, options] = mocks.createSession.mock.calls[0];
    expect(params).toMatchObject({
      mode: 'setup',
      customer: 'cus_aura',
      currency: 'eur',
      locale: 'es',
      metadata: { kind: 'onsite_setup', providerId: 'prov-aura' },
      setup_intent_data: { metadata: { kind: 'onsite_setup', providerId: 'prov-aura' } },
      success_url: URLS.successUrl,
    });
    expect(params).not.toHaveProperty('payment_method_types');
    expect(params.integration_identifier).toMatch(/-[a-z]{8}$/);
    expect(options.idempotencyKey).toMatch(/^onsite-setup:prov-aura:ca:\d+$/);
  });

  it('envuelve el fallo de Stripe en BillingStripeError', async () => {
    mocks.createSession.mockRejectedValue(new Error('down'));
    await expect(createOnsiteSetupSession('prov-aura', URLS, 'es')).rejects.toBeInstanceOf(
      BillingStripeError,
    );
  });
});

describe('completeOnsiteSetup', () => {
  it('fija el método por defecto de las facturas y marca el negocio', async () => {
    const result = await completeOnsiteSetup(session(), NOW);

    expect(mocks.updateCustomer).toHaveBeenCalledWith('cus_aura', {
      invoice_settings: { default_payment_method: 'pm_1' },
    });
    expect(mocks.markReady).toHaveBeenCalledWith('prov-aura', NOW);
    expect(result).toEqual({ providerId: 'prov-aura', paymentMethodId: 'pm_1' });
  });

  it('sin deuda no intenta cobrar nada', async () => {
    await completeOnsiteSetup(session(), NOW);
    expect(mocks.settle).not.toHaveBeenCalled();
  });

  it('con comisiones impagadas, intenta cobrarlas ya con el método nuevo', async () => {
    mocks.findByCustomerId.mockResolvedValue({
      providerId: 'prov-aura',
      commissionDebtSince: new Date('2026-11-01T00:00:00Z'),
    });
    await completeOnsiteSetup(session(), NOW);
    expect(mocks.settle).toHaveBeenCalledWith('prov-aura', 'pm_1', NOW);
    // Primero queda guardado el método: si el cobro falla, sigue listo.
    expect(mocks.markReady.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.settle.mock.invocationCallOrder[0]!,
    );
  });

  it('sesión aún no completa: no hace nada', async () => {
    await expect(completeOnsiteSetup(session({ status: 'open' }))).resolves.toBeNull();
    expect(mocks.updateCustomer).not.toHaveBeenCalled();
  });

  it('rechaza un Checkout que no es de setup nuestro', async () => {
    await expect(completeOnsiteSetup(session({ mode: 'subscription' }))).rejects.toBeInstanceOf(
      CheckoutSessionMismatchError,
    );
    await expect(completeOnsiteSetup(session({ metadata: {} }))).rejects.toBeInstanceOf(
      CheckoutSessionMismatchError,
    );
  });

  it('rechaza un Customer que no es de ningún negocio', async () => {
    mocks.findByCustomerId.mockResolvedValue(null);
    await expect(completeOnsiteSetup(session())).rejects.toBeInstanceOf(
      CheckoutSessionMismatchError,
    );
    expect(mocks.markReady).not.toHaveBeenCalled();
  });
});

describe('confirmOnsiteSetupSession', () => {
  it('rechaza un session_id con formato inválido sin llamar a Stripe', async () => {
    await expect(confirmOnsiteSetupSession('nope', 'prov-aura')).rejects.toBeInstanceOf(
      CheckoutSessionMismatchError,
    );
    expect(mocks.retrieveSession).not.toHaveBeenCalled();
  });

  it('una sesión de otro negocio no escribe nada', async () => {
    await expect(confirmOnsiteSetupSession('cs_test_setup1', 'prov-otro')).rejects.toBeInstanceOf(
      CheckoutSessionMismatchError,
    );
    expect(mocks.updateCustomer).not.toHaveBeenCalled();
    expect(mocks.markReady).not.toHaveBeenCalled();
  });

  it('guarda el método si la sesión es del negocio', async () => {
    await expect(confirmOnsiteSetupSession('cs_test_setup1', 'prov-aura')).resolves.toMatchObject({
      paymentMethodId: 'pm_1',
    });
  });
});
