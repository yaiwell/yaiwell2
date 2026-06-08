/**
 * Tests del Route Handler `/api/webhooks/stripe`.
 *
 * Mockeamos `@/lib/integrations/stripe` para controlar el resultado de
 * la verificación de firma sin tener que generar firmas válidas con el
 * SDK real en cada test.
 *
 * Cubrimos:
 *  - 400 cuando falta el header `stripe-signature`.
 *  - 501 cuando falta `STRIPE_WEBHOOK_SECRET`.
 *  - 400 cuando la firma no verifica.
 *  - 200 + `{received, type, handled:false}` para eventos verificados.
 *  - 500 cuando el verificador lanza un error inesperado (no tipado).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyMock, StripeWebhookConfigErrorStub, StripeWebhookSignatureErrorStub } = vi.hoisted(
  () => {
    class StripeWebhookConfigErrorStub extends Error {
      readonly code = 'STRIPE_WEBHOOK_NOT_CONFIGURED';
    }
    class StripeWebhookSignatureErrorStub extends Error {
      readonly code = 'STRIPE_WEBHOOK_SIGNATURE_INVALID';
    }
    return {
      verifyMock: vi.fn(),
      StripeWebhookConfigErrorStub,
      StripeWebhookSignatureErrorStub,
    };
  },
);

vi.mock('@/lib/integrations/stripe', () => ({
  verifyStripeWebhook: verifyMock,
  StripeWebhookConfigError: StripeWebhookConfigErrorStub,
  StripeWebhookSignatureError: StripeWebhookSignatureErrorStub,
}));

import { POST } from './route';

/**
 * Construye un `NextRequest` mínimo con el header `stripe-signature`
 * y un body en texto. Como la firma se mockea, el body puede ser
 * cualquier cosa serializable.
 */
function buildRequest(options: { headers?: Record<string, string>; body?: string } = {}) {
  const headers = new Headers({
    'stripe-signature': 't=1700000000,v1,fake',
    ...(options.headers ?? {}),
  });
  return {
    headers: {
      get: (key: string) => headers.get(key),
    },
    text: async () => options.body ?? '{}',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('400 cuando falta el header stripe-signature', async () => {
    const res = await POST(buildRequest({ headers: { 'stripe-signature': '' } }));
    expect(res.status).toBe(400);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('501 cuando el verificador lanza StripeWebhookConfigError', async () => {
    verifyMock.mockImplementation(() => {
      throw new StripeWebhookConfigErrorStub();
    });
    const res = await POST(buildRequest());
    expect(res.status).toBe(501);
  });

  it('400 cuando el verificador lanza StripeWebhookSignatureError', async () => {
    verifyMock.mockImplementation(() => {
      throw new StripeWebhookSignatureErrorStub();
    });
    const res = await POST(buildRequest({ body: '{"type":"payment_intent.succeeded"}' }));
    expect(res.status).toBe(400);
  });

  it('200 + payload `received/type/handled:false` para eventos verificados', async () => {
    verifyMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test' } },
    });

    const res = await POST(buildRequest({ body: '{"type":"payment_intent.succeeded"}' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      received: true,
      type: 'payment_intent.succeeded',
      handled: false,
    });
  });

  it('pasa el body crudo al verificador (no parseado)', async () => {
    verifyMock.mockReturnValue({ type: 'account.updated', data: {} });
    const raw = '{"id":"evt_test","type":"account.updated"}';

    await POST(buildRequest({ body: raw }));

    expect(verifyMock).toHaveBeenCalledWith(raw, 't=1700000000,v1,fake');
  });

  it('propaga errores inesperados (no tipados) para que Next devuelva 500', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('boom unexpected');
    });

    await expect(POST(buildRequest())).rejects.toThrow('boom unexpected');
  });
});
