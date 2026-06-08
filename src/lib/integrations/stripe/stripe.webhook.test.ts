/**
 * Tests de `verifyStripeWebhook`.
 *
 * Mockeamos `./stripe.client` para no necesitar el SDK real ni la
 * `STRIPE_SECRET_KEY`. El test solo verifica que orquestamos bien:
 *  - Lanzamos `StripeWebhookConfigError` si falta el secret.
 *  - Lanzamos `StripeWebhookSignatureError` si el SDK lanza al verificar
 *    (sin propagar el mensaje original — protección contra leak de PII
 *    en logs).
 *  - Devolvemos el evento parseado en el camino feliz.
 *  - Pasamos los 3 argumentos al SDK en el orden correcto (rawBody,
 *    signature, secret).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { constructEventMock } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
}));

vi.mock('./stripe.client', () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent: constructEventMock,
    },
  }),
}));

import { StripeWebhookConfigError, StripeWebhookSignatureError } from './stripe.errors';
import { verifyStripeWebhook } from './stripe.webhook';

describe('verifyStripeWebhook', () => {
  const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    constructEventMock.mockReset();
  });

  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  it('lanza StripeWebhookConfigError cuando falta el secret', () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => verifyStripeWebhook('{}', 'sig')).toThrow(StripeWebhookConfigError);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it('lanza StripeWebhookSignatureError cuando el SDK lanza', () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    expect(() => verifyStripeWebhook('{}', 'sig_invalid')).toThrow(StripeWebhookSignatureError);
  });

  it('no propaga el mensaje del SDK al caller (evita leak de PII)', () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('sensitive payload fragment leaked');
    });

    try {
      verifyStripeWebhook('{}', 'sig_invalid');
      expect.fail('debería haber lanzado');
    } catch (error) {
      expect(error).toBeInstanceOf(StripeWebhookSignatureError);
      expect((error as Error).message).not.toContain('sensitive payload');
    }
  });

  it('devuelve el evento parseado en el camino feliz', () => {
    const evt = { id: 'evt_1', type: 'payment_intent.succeeded', data: { object: {} } };
    constructEventMock.mockReturnValue(evt);

    const result = verifyStripeWebhook('{"type":"payment_intent.succeeded"}', 'sig');

    expect(result).toBe(evt);
  });

  it('pasa rawBody, signature y secret al SDK en orden correcto', () => {
    constructEventMock.mockReturnValue({ id: 'evt_1', type: 'foo' });

    verifyStripeWebhook('raw-body', 'stripe-sig');

    expect(constructEventMock).toHaveBeenCalledWith('raw-body', 'stripe-sig', 'whsec_test');
  });
});
