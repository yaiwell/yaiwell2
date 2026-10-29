/**
 * Tests de la rama de Stripe Billing del webhook: enrutado a
 * `handleBillingEvent`, política de códigos HTTP y avisos programados
 * solo en transiciones reales.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyMock } = vi.hoisted(() => ({ verifyMock: vi.fn() }));
vi.mock('@/lib/integrations/stripe', () => {
  class StripeWebhookConfigError extends Error {}
  class StripeWebhookSignatureError extends Error {}
  return { verifyStripeWebhook: verifyMock, StripeWebhookConfigError, StripeWebhookSignatureError };
});

const { handleMock, NotFoundStub } = vi.hoisted(() => {
  class NotFoundStub extends Error {
    readonly code = 'BILLING_PROVIDER_NOT_FOUND';
  }
  return { handleMock: vi.fn(), NotFoundStub };
});
vi.mock('@/lib/services/billing', () => ({
  handleBillingEvent: handleMock,
  isBillingEvent: (type: string) =>
    type.startsWith('customer.subscription.') ||
    type.startsWith('invoice.') ||
    type === 'checkout.session.completed',
  BillingProviderNotFoundError: NotFoundStub,
}));

const confirmMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/services/checkout', () => ({
  confirmBookingPayment: confirmMock,
  failBookingPayment: vi.fn(),
  refundBookingPayment: vi.fn(),
  recordAsyncRefundFailure: vi.fn(),
  BookingForCheckoutNotFoundError: class extends Error {},
  MissingBookingReferenceError: class extends Error {},
}));

const notify = vi.hoisted(() => ({
  schedule: vi.fn((task: () => Promise<void>) => void task()),
  failed: vi.fn(async () => {}),
  downgraded: vi.fn(async () => {}),
}));
vi.mock('@/lib/services/notifications', () => ({
  scheduleNotification: notify.schedule,
  notifyPlanPaymentFailed: notify.failed,
  notifyPlanDowngraded: notify.downgraded,
  notifyBookingConfirmed: vi.fn(),
  notifyLatePaymentRefunded: vi.fn(),
  notifyRefundCompleted: vi.fn(),
  notifyRefundDelayed: vi.fn(),
}));

import { POST } from './route';

function buildRequest() {
  return {
    headers: { get: (key: string) => (key === 'stripe-signature' ? 't=1,v1=fake' : null) },
    text: async () => '{}',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function givenEvent(type: string) {
  verifyMock.mockReturnValue({ type, created: 1_790_000_000, data: { object: { id: 'x' } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/webhooks/stripe — planes', () => {
  it('enruta customer.subscription.updated al dominio billing', async () => {
    givenEvent('customer.subscription.updated');
    handleMock.mockResolvedValue({ handled: true, providerId: 'prov-1' });
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      received: true,
      type: 'customer.subscription.updated',
      handled: true,
      providerId: 'prov-1',
    });
    expect(confirmMock).not.toHaveBeenCalled();
    expect(notify.schedule).not.toHaveBeenCalled();
  });

  it('avisa de la bajada a Gratis solo cuando el plan cambia', async () => {
    givenEvent('customer.subscription.deleted');
    handleMock.mockResolvedValue({
      handled: true,
      providerId: 'prov-1',
      planChanged: { from: 'pro', to: 'free' },
    });
    await POST(buildRequest());
    expect(notify.downgraded).toHaveBeenCalledWith('prov-1', 'pro');

    notify.downgraded.mockClear();
    handleMock.mockResolvedValue({ handled: false, providerId: 'prov-1' });
    await POST(buildRequest());
    expect(notify.downgraded).not.toHaveBeenCalled();
  });

  it('una subida de plan no manda el aviso de bajada', async () => {
    givenEvent('customer.subscription.updated');
    handleMock.mockResolvedValue({
      handled: true,
      providerId: 'prov-1',
      planChanged: { from: 'free', to: 'basic' },
    });
    await POST(buildRequest());
    expect(notify.downgraded).not.toHaveBeenCalled();
  });

  it('programa el aviso de cobro fallido con su clave', async () => {
    givenEvent('invoice.payment_failed');
    handleMock.mockResolvedValue({
      handled: true,
      providerId: 'prov-1',
      paymentFailedKey: 'in_1:2',
    });
    await POST(buildRequest());
    expect(notify.failed).toHaveBeenCalledWith('prov-1', 'in_1:2');
  });

  it('200 handled:false si el evento no es de ningún negocio nuestro', async () => {
    givenEvent('invoice.paid');
    handleMock.mockRejectedValue(new NotFoundStub('ajeno'));
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, type: 'invoice.paid', handled: false });
  });

  it('500 ante un fallo transitorio para que Stripe reintente', async () => {
    givenEvent('customer.subscription.updated');
    handleMock.mockRejectedValue(new Error('db down'));
    const res = await POST(buildRequest());
    expect(res.status).toBe(500);
  });
});
