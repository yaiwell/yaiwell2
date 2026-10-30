/**
 * Tests del enrutado de `handleBillingEvent` para el pago en el local:
 * Checkout de setup, eventos de factura nuevos y suma de las partes de
 * plan y de comisiones en una misma factura.
 */
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  syncSubscription: vi.fn(),
  findByCustomerId: vi.fn(),
  claimPaymentFailure: vi.fn(),
  clearPaymentFailure: vi.fn(),
  applyCommission: vi.fn(),
  completeSetup: vi.fn(),
}));
vi.mock('./billing.sync', () => ({ syncSubscription: mocks.syncSubscription }));
vi.mock('./billing.repository', () => ({
  billingRepository: {
    findByCustomerId: mocks.findByCustomerId,
    claimPaymentFailure: mocks.claimPaymentFailure,
    clearPaymentFailure: mocks.clearPaymentFailure,
  },
}));
vi.mock('./billing.commission.webhook', () => ({
  applyCommissionInvoiceEvent: mocks.applyCommission,
}));
vi.mock('./billing.payment-method.webhook', () => ({
  handlePaymentMethodChange: vi.fn(async () => ({ handled: false })),
}));
vi.mock('./billing.setup', () => ({
  isOnsiteSetupSession: (session: { mode?: string; metadata?: { kind?: string } }) =>
    session.mode === 'setup' && session.metadata?.kind === 'onsite_setup',
  completeOnsiteSetup: mocks.completeSetup,
}));

import { BillingProviderNotFoundError, CheckoutSessionMismatchError } from './billing.errors';
import { buildBillingRow, PROVIDER_ID } from './billing.test-fixtures';
import { handleBillingEvent, isBillingEvent } from './billing.webhook.service';

function event(type: string, object: Record<string, unknown>, created = 1_790_000_000) {
  return { type, created, data: { object } } as unknown as Stripe.Event;
}

const looseInvoice = { id: 'in_c', customer: 'cus_aura', attempt_count: 1, parent: null };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findByCustomerId.mockResolvedValue(buildBillingRow());
  mocks.syncSubscription.mockResolvedValue({ changed: false, providerId: PROVIDER_ID });
  mocks.claimPaymentFailure.mockResolvedValue(true);
  mocks.clearPaymentFailure.mockResolvedValue(false);
  mocks.applyCommission.mockResolvedValue(null);
});

describe('eventos nuevos', () => {
  it.each([
    'invoice.finalized',
    'invoice.marked_uncollectible',
    'invoice.voided',
    'payment_method.detached',
    'customer.updated',
  ])('%s es un evento de Billing', (type) => expect(isBillingEvent(type)).toBe(true));
});

describe('facturas de comisiones', () => {
  it('factura suelta: solo la parte de comisiones, con su aviso', async () => {
    mocks.applyCommission.mockResolvedValue({
      providerId: PROVIDER_ID,
      changed: true,
      paymentFailedKey: 'in_c:1',
    });
    const result = await handleBillingEvent(event('invoice.payment_failed', looseInvoice));

    expect(mocks.syncSubscription).not.toHaveBeenCalled();
    expect(mocks.applyCommission).toHaveBeenCalledWith(
      'invoice.payment_failed',
      looseInvoice,
      new Date(1_790_000_000 * 1000),
    );
    expect(result).toEqual({
      handled: true,
      providerId: PROVIDER_ID,
      commissionPaymentFailedKey: 'in_c:1',
    });
  });

  it('invoice.finalized sin comisiones no es nuestro', async () => {
    await expect(handleBillingEvent(event('invoice.finalized', looseInvoice))).resolves.toEqual({
      handled: false,
    });
  });

  it('renovación del plan con comisiones: suma las dos partes', async () => {
    mocks.applyCommission.mockResolvedValue({ providerId: PROVIDER_ID, changed: true });
    const result = await handleBillingEvent(
      event('invoice.paid', {
        ...looseInvoice,
        parent: { subscription_details: { subscription: 'sub_1' } },
      }),
    );
    expect(mocks.syncSubscription).toHaveBeenCalledWith('sub_1');
    expect(result).toEqual({ handled: true, providerId: PROVIDER_ID });
  });

  it('invoice.finalized de una suscripción no toca el plan', async () => {
    await handleBillingEvent(
      event('invoice.finalized', {
        ...looseInvoice,
        parent: { subscription_details: { subscription: 'sub_1' } },
      }),
    );
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
    expect(mocks.applyCommission).toHaveBeenCalled();
  });
});

describe('Checkout de setup', () => {
  const setup = {
    id: 'cs_test_1',
    mode: 'setup',
    metadata: { kind: 'onsite_setup', providerId: PROVIDER_ID },
  };

  it('guarda el método de pago de comisiones', async () => {
    mocks.completeSetup.mockResolvedValue({ providerId: PROVIDER_ID, paymentMethodId: 'pm_1' });
    const result = await handleBillingEvent(event('checkout.session.completed', setup));
    expect(result).toEqual({ handled: true, providerId: PROVIDER_ID });
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it('un setup de un Customer ajeno → BillingProviderNotFoundError (200 sin reintento)', async () => {
    mocks.completeSetup.mockRejectedValue(new CheckoutSessionMismatchError());
    await expect(
      handleBillingEvent(event('checkout.session.completed', setup)),
    ).rejects.toBeInstanceOf(BillingProviderNotFoundError);
  });

  it('un setup que no es nuestro no se procesa', async () => {
    const result = await handleBillingEvent(
      event('checkout.session.completed', { mode: 'setup', metadata: {} }),
    );
    expect(result).toEqual({ handled: false });
    expect(mocks.completeSetup).not.toHaveBeenCalled();
  });
});
