/**
 * Tests de `handleBillingEvent`: enrutado por tipo de evento, resolución
 * del negocio por Customer y reclamo idempotente de los avisos de impago.
 */
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  syncSubscription: vi.fn(),
  findByCustomerId: vi.fn(),
  claimPaymentFailure: vi.fn(),
  clearPaymentFailure: vi.fn(),
}));
vi.mock('./billing.sync', () => ({ syncSubscription: mocks.syncSubscription }));
vi.mock('./billing.repository', () => ({
  billingRepository: {
    findByCustomerId: mocks.findByCustomerId,
    claimPaymentFailure: mocks.claimPaymentFailure,
    clearPaymentFailure: mocks.clearPaymentFailure,
  },
}));

import { BillingProviderNotFoundError } from './billing.errors';
import { buildBillingRow, CUSTOMER_ID, PROVIDER_ID } from './billing.test-fixtures';
import { handleBillingEvent, isBillingEvent } from './billing.webhook.service';

function event(type: string, object: Record<string, unknown>, created = 1_790_000_000) {
  return { type, created, data: { object } } as unknown as Stripe.Event;
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'in_1',
    customer: CUSTOMER_ID,
    attempt_count: 2,
    billing_reason: 'subscription_cycle',
    parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1' } },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findByCustomerId.mockResolvedValue(buildBillingRow());
  mocks.syncSubscription.mockResolvedValue({ changed: false, providerId: PROVIDER_ID });
  mocks.claimPaymentFailure.mockResolvedValue(true);
  mocks.clearPaymentFailure.mockResolvedValue(false);
});

describe('isBillingEvent', () => {
  it('reconoce los eventos de Billing y no los de reservas', () => {
    expect(isBillingEvent('customer.subscription.updated')).toBe(true);
    expect(isBillingEvent('invoice.paid')).toBe(true);
    expect(isBillingEvent('payment_intent.succeeded')).toBe(false);
  });
});

describe('handleBillingEvent', () => {
  it.each([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ])('%s sincroniza la suscripción del evento', async (type) => {
    mocks.syncSubscription.mockResolvedValue({
      changed: true,
      providerId: PROVIDER_ID,
      planChanged: { from: 'pro', to: 'free' },
    });
    const result = await handleBillingEvent(event(type, { id: 'sub_9' }));
    expect(mocks.syncSubscription).toHaveBeenCalledWith('sub_9');
    expect(result).toEqual({
      handled: true,
      providerId: PROVIDER_ID,
      planChanged: { from: 'pro', to: 'free' },
    });
  });

  it('checkout.session.completed de suscripción sincroniza', async () => {
    await handleBillingEvent(
      event('checkout.session.completed', { mode: 'subscription', subscription: 'sub_2' }),
    );
    expect(mocks.syncSubscription).toHaveBeenCalledWith('sub_2');
  });

  it('checkout.session.completed de pago único no es nuestro', async () => {
    const result = await handleBillingEvent(
      event('checkout.session.completed', { mode: 'payment', subscription: null }),
    );
    expect(result).toEqual({ handled: false });
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it('invoice.payment_failed reclama el aviso por factura e intento', async () => {
    const result = await handleBillingEvent(event('invoice.payment_failed', invoice()));
    expect(mocks.claimPaymentFailure).toHaveBeenCalledWith(
      PROVIDER_ID,
      'sub_1',
      new Date(1_790_000_000 * 1000),
      'in_1:2',
    );
    expect(mocks.syncSubscription).toHaveBeenCalledWith('sub_1');
    expect(result).toEqual({ handled: true, providerId: PROVIDER_ID, paymentFailedKey: 'in_1:2' });
  });

  it('reentrega del mismo fallo: sin aviso', async () => {
    mocks.claimPaymentFailure.mockResolvedValue(false);
    const result = await handleBillingEvent(event('invoice.payment_failed', invoice()));
    expect(result.paymentFailedKey).toBeUndefined();
  });

  it('el fallo del primer cobro (Checkout) no avisa por email', async () => {
    const result = await handleBillingEvent(
      event('invoice.payment_failed', invoice({ billing_reason: 'subscription_create' })),
    );
    expect(result.paymentFailedKey).toBeUndefined();
  });

  it('si el fallo baja el plan a Gratis, el aviso es el de la bajada', async () => {
    mocks.syncSubscription.mockResolvedValue({
      changed: true,
      providerId: PROVIDER_ID,
      planChanged: { from: 'basic', to: 'free' },
    });
    const result = await handleBillingEvent(event('invoice.payment_failed', invoice()));
    expect(result).toEqual({
      handled: true,
      providerId: PROVIDER_ID,
      planChanged: { from: 'basic', to: 'free' },
    });
  });

  it('invoice.payment_action_required usa la misma clave que el fallo', async () => {
    const result = await handleBillingEvent(event('invoice.payment_action_required', invoice()));
    expect(result.paymentFailedKey).toBe('in_1:2');
  });

  it('invoice.paid limpia el impago y sincroniza', async () => {
    mocks.clearPaymentFailure.mockResolvedValue(true);
    const result = await handleBillingEvent(event('invoice.paid', invoice()));
    // Solo salda el impago de la suscripción en curso (filtra por ella).
    expect(mocks.clearPaymentFailure).toHaveBeenCalledWith(PROVIDER_ID, 'sub_1');
    // Tras sincronizar: si la factura adopta la suscripción, ya cuenta.
    expect(mocks.syncSubscription.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.clearPaymentFailure.mock.invocationCallOrder[0]!,
    );
    expect(mocks.syncSubscription).toHaveBeenCalledWith('sub_1');
    expect(result).toEqual({ handled: true, providerId: PROVIDER_ID });
  });

  it('una factura sin suscripción no es de planes', async () => {
    const result = await handleBillingEvent(event('invoice.paid', invoice({ parent: null })));
    expect(result).toEqual({ handled: false });
    expect(mocks.findByCustomerId).not.toHaveBeenCalled();
  });

  it('factura de un Customer ajeno → BillingProviderNotFoundError', async () => {
    mocks.findByCustomerId.mockResolvedValue(null);
    await expect(
      handleBillingEvent(event('invoice.payment_failed', invoice())),
    ).rejects.toBeInstanceOf(BillingProviderNotFoundError);
    expect(mocks.claimPaymentFailure).not.toHaveBeenCalled();
  });

  it('propaga los fallos transitorios (la ruta responde 500)', async () => {
    mocks.syncSubscription.mockRejectedValue(new Error('db down'));
    await expect(
      handleBillingEvent(event('customer.subscription.updated', { id: 'sub_1' })),
    ).rejects.toThrow('db down');
  });

  it('eventos de una cuenta conectada no son de planes', async () => {
    const connected = {
      ...event('customer.subscription.updated', { id: 'sub_1' }),
      account: 'acct_123',
    } as unknown as Stripe.Event;
    await expect(handleBillingEvent(connected)).resolves.toEqual({ handled: false });
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
  });

  it('invoice.paid de otra suscripción no limpia el impago', async () => {
    mocks.clearPaymentFailure.mockResolvedValue(false);
    const result = await handleBillingEvent(event('invoice.paid', invoice()));
    expect(result).toEqual({ handled: false, providerId: PROVIDER_ID });
  });
});
