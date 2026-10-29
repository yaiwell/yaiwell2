/**
 * Tests de `reuseOrExpireOpenSessions`: como mucho una sesión de Checkout
 * de plan abierta por Customer (reutiliza la equivalente, caduca el resto).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  checkout: { sessions: { list: vi.fn(), expire: vi.fn(), retrieve: vi.fn() } },
}));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

import { reuseOrExpireOpenSessions } from './billing.checkout-sessions';
import { BillingStripeError } from './billing.errors';
import { CUSTOMER_ID, PROVIDER_ID } from './billing.test-fixtures';

const SUCCESS =
  'https://yaiwell.app/es/panel/plan?checkout=success&session_id={CHECKOUT_SESSION_ID}';
const MATCH = { tier: 'pro', stripeLocale: 'es', successUrl: SUCCESS };

function session(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    mode: 'subscription',
    url: `https://checkout.stripe.com/c/pay/${id}`,
    locale: 'es',
    success_url: SUCCESS,
    metadata: { providerId: PROVIDER_ID, tier: 'pro' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  stripeMock.checkout.sessions.expire.mockReset();
});

describe('reuseOrExpireOpenSessions', () => {
  it('lista solo las abiertas del Customer', async () => {
    stripeMock.checkout.sessions.list.mockResolvedValue({ data: [] });
    await expect(reuseOrExpireOpenSessions(CUSTOMER_ID, MATCH)).resolves.toBeNull();
    expect(stripeMock.checkout.sessions.list).toHaveBeenCalledWith({
      customer: CUSTOMER_ID,
      status: 'open',
      limit: 20,
    });
  });

  it('reutiliza la sesión equivalente y caduca las demás', async () => {
    stripeMock.checkout.sessions.list.mockResolvedValue({
      data: [
        session('cs_test_old', { metadata: { providerId: PROVIDER_ID, tier: 'basic' } }),
        session('cs_test_same'),
      ],
    });
    const result = await reuseOrExpireOpenSessions(CUSTOMER_ID, MATCH);
    expect(result).toEqual({
      sessionId: 'cs_test_same',
      url: 'https://checkout.stripe.com/c/pay/cs_test_same',
    });
    expect(stripeMock.checkout.sessions.expire).toHaveBeenCalledTimes(1);
    expect(stripeMock.checkout.sessions.expire).toHaveBeenCalledWith('cs_test_old');
  });

  it.each([
    ['otro idioma', { locale: 'de' }],
    ['otra vuelta', { success_url: 'https://otra' }],
  ])('con %s no reutiliza: caduca y devuelve null', async (_label, overrides) => {
    stripeMock.checkout.sessions.list.mockResolvedValue({
      data: [session('cs_test_1', overrides)],
    });
    await expect(reuseOrExpireOpenSessions(CUSTOMER_ID, MATCH)).resolves.toBeNull();
    expect(stripeMock.checkout.sessions.expire).toHaveBeenCalledWith('cs_test_1');
  });

  it('no toca sesiones ajenas (pago único o sin nuestra metadata)', async () => {
    stripeMock.checkout.sessions.list.mockResolvedValue({
      data: [session('cs_test_pay', { mode: 'payment' }), session('cs_test_x', { metadata: {} })],
    });
    await reuseOrExpireOpenSessions(CUSTOMER_ID, MATCH);
    expect(stripeMock.checkout.sessions.expire).not.toHaveBeenCalled();
  });

  it('si al caducar ya no estaba abierta (se pagó o caducó), sigue', async () => {
    stripeMock.checkout.sessions.list.mockResolvedValue({
      data: [session('cs_test_1', { locale: 'de' })],
    });
    stripeMock.checkout.sessions.expire.mockRejectedValue(new Error('not open'));
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({ status: 'complete' });
    await expect(reuseOrExpireOpenSessions(CUSTOMER_ID, MATCH)).resolves.toBeNull();
  });

  it('si no se puede caducar una abierta, falla (no se crea otra pagable)', async () => {
    stripeMock.checkout.sessions.list.mockResolvedValue({
      data: [session('cs_test_1', { locale: 'de' })],
    });
    stripeMock.checkout.sessions.expire.mockRejectedValue(new Error('network'));
    stripeMock.checkout.sessions.retrieve.mockResolvedValue({ status: 'open' });
    await expect(reuseOrExpireOpenSessions(CUSTOMER_ID, MATCH)).rejects.toBeInstanceOf(
      BillingStripeError,
    );
  });
});
