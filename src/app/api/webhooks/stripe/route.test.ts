/**
 * Tests del Route Handler `/api/webhooks/stripe`.
 *
 * Mockeamos `@/lib/integrations/stripe` para controlar el resultado de
 * la verificación de firma sin generar firmas válidas con el SDK real,
 * y `@/lib/services/checkout` para aislar el enrutado de eventos de la
 * lógica de transición (que tiene sus propios tests).
 *
 * Lo que se verifica aquí es la **política de códigos HTTP**, porque de
 * ella depende si Stripe reintenta o no:
 *  - 400 sin header / con firma inválida (no reintenta: petición falsa).
 *  - 501 sin `STRIPE_WEBHOOK_SECRET`.
 *  - 200 para eventos verificados, los manejemos o no.
 *  - 200 cuando el evento no apunta a ninguna reserva nuestra
 *    (reintentar no lo arreglaría).
 *  - 500 ante fallos transitorios, para que Stripe reintente y no
 *    perdamos un `succeeded`.
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

const { confirmMock, failMock, refundMock, refundUpdatedMock, NotFoundStub, MissingRefStub } =
  vi.hoisted(() => {
    class NotFoundStub extends Error {
      readonly code = 'BOOKING_FOR_CHECKOUT_NOT_FOUND';
    }
    class MissingRefStub extends Error {
      readonly code = 'MISSING_BOOKING_REFERENCE';
    }
    return {
      confirmMock: vi.fn(),
      failMock: vi.fn(),
      refundMock: vi.fn(),
      refundUpdatedMock: vi.fn(),
      NotFoundStub,
      MissingRefStub,
    };
  });

vi.mock('@/lib/services/checkout', () => ({
  confirmBookingPayment: confirmMock,
  failBookingPayment: failMock,
  refundBookingPayment: refundMock,
  recordAsyncRefundFailure: refundUpdatedMock,
  BookingForCheckoutNotFoundError: NotFoundStub,
  MissingBookingReferenceError: MissingRefStub,
}));

const { scheduleMock, notifyConfirmedMock, notifyLateRefundMock } = vi.hoisted(() => ({
  scheduleMock: vi.fn((task: () => Promise<void>) => void task()),
  notifyConfirmedMock: vi.fn(async () => {}),
  notifyLateRefundMock: vi.fn(async () => {}),
}));

// `after()` solo existe dentro de una petición real: lo sustituimos por
// una ejecución inmediata para comprobar qué aviso se programa.
vi.mock('@/lib/services/notifications', () => ({
  scheduleNotification: scheduleMock,
  notifyBookingConfirmed: notifyConfirmedMock,
  notifyLatePaymentRefunded: notifyLateRefundMock,
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
    confirmMock.mockReset();
    failMock.mockReset();
    refundMock.mockReset();
    refundUpdatedMock.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('confirma la reserva ante payment_intent.succeeded', async () => {
    const intent = { id: 'pi_test', metadata: { bookingId: 'bk-1' } };
    verifyMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      created: 1_790_000_000,
      data: { object: intent },
    });
    confirmMock.mockResolvedValue({ bookingId: 'bk-1', changed: true, status: 'confirmed' });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    // `event.created` viene en segundos: la retención se evalúa con él.
    expect(confirmMock).toHaveBeenCalledWith(intent, {
      paidAt: new Date(1_790_000_000 * 1000),
    });
    expect(await res.json()).toEqual({
      received: true,
      type: 'payment_intent.succeeded',
      handled: true,
      bookingId: 'bk-1',
      status: 'confirmed',
    });
  });

  it('avisa por email solo cuando la reserva pasa a confirmed', async () => {
    verifyMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      created: 1_790_000_000,
      data: { object: { id: 'pi_test', metadata: { bookingId: 'bk-1' } } },
    });
    confirmMock.mockResolvedValue({ bookingId: 'bk-1', changed: true, status: 'confirmed' });
    await POST(buildRequest());
    expect(notifyConfirmedMock).toHaveBeenCalledWith('bk-1');

    // Reentrega del mismo evento: sin cambio de estado, sin segundo correo.
    notifyConfirmedMock.mockClear();
    confirmMock.mockResolvedValue({ bookingId: 'bk-1', changed: false, status: 'confirmed' });
    await POST(buildRequest());
    expect(notifyConfirmedMock).not.toHaveBeenCalled();
  });

  it('avisa del reembolso de un pago tardío y no del recibo', async () => {
    verifyMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      created: 1_790_000_000,
      data: { object: { id: 'pi_test', metadata: { bookingId: 'bk-1' } } },
    });
    confirmMock.mockResolvedValue({
      bookingId: 'bk-1',
      changed: true,
      status: 'cancelled',
      lateRefund: 'issued',
    });

    await POST(buildRequest());

    expect(notifyLateRefundMock).toHaveBeenCalledWith('bk-1', 'issued');
    expect(notifyConfirmedMock).not.toHaveBeenCalled();
  });

  it('cancela la reserva ante payment_intent.payment_failed', async () => {
    const intent = { id: 'pi_test', metadata: { bookingId: 'bk-2' } };
    verifyMock.mockReturnValue({ type: 'payment_intent.payment_failed', data: { object: intent } });
    failMock.mockResolvedValue({ bookingId: 'bk-2', changed: true, status: 'cancelled' });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(failMock).toHaveBeenCalledWith(intent);
    expect((await res.json()).status).toBe('cancelled');
  });

  it('encola el refund ante charge.refund.updated', async () => {
    const refund = { id: 're_1', status: 'failed' };
    verifyMock.mockReturnValue({ type: 'charge.refund.updated', data: { object: refund } });
    refundUpdatedMock.mockResolvedValue({ bookingId: 'bk-4', changed: true, status: 'cancelled' });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(refundUpdatedMock).toHaveBeenCalledWith(refund);
  });

  it('marca como refunded ante charge.refunded', async () => {
    const charge = { id: 'ch_test', payment_intent: 'pi_test', metadata: { bookingId: 'bk-3' } };
    verifyMock.mockReturnValue({
      type: 'charge.refunded',
      created: 1_790_000_000,
      data: { object: charge },
    });
    refundMock.mockResolvedValue({ bookingId: 'bk-3', changed: true, status: 'refunded' });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(refundMock).toHaveBeenCalledWith(charge, {
      eventCreatedAt: new Date(1_790_000_000 * 1000),
    });
    expect((await res.json()).status).toBe('refunded');
  });

  it('devuelve handled:false cuando el evento era un reintento sin cambio', async () => {
    verifyMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: { bookingId: 'bk-1' } } },
    });
    confirmMock.mockResolvedValue({ bookingId: 'bk-1', changed: false, status: 'confirmed' });

    const res = await POST(buildRequest());

    expect((await res.json()).handled).toBe(false);
  });

  it('200 + handled:false para eventos verificados que no manejamos', async () => {
    verifyMock.mockReturnValue({ type: 'account.updated', data: { object: {} } });

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      received: true,
      type: 'account.updated',
      handled: false,
    });
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('200 cuando el evento no referencia ninguna reserva nuestra', async () => {
    // Reintentarlo no lo arreglaría: si devolviéramos 5xx, Stripe lo
    // repetiría durante días contra un id que nunca va a existir.
    verifyMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_ajeno', metadata: {} } },
    });
    confirmMock.mockRejectedValue(new NotFoundStub());

    const res = await POST(buildRequest());

    expect(res.status).toBe(200);
    expect((await res.json()).handled).toBe(false);
  });

  it('500 ante un fallo transitorio para que Stripe reintente', async () => {
    verifyMock.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test', metadata: { bookingId: 'bk-1' } } },
    });
    confirmMock.mockRejectedValue(new Error('connection reset'));

    const res = await POST(buildRequest());

    expect(res.status).toBe(500);
  });

  it('pasa el body crudo al verificador (no parseado)', async () => {
    verifyMock.mockReturnValue({ type: 'account.updated', data: { object: {} } });
    const raw = '{"id":"evt_test","type":"account.updated"}';

    await POST(buildRequest({ body: raw }));

    expect(verifyMock).toHaveBeenCalledWith(raw, 't=1700000000,v1,fake');
  });

  it('propaga errores inesperados del verificador para que Next devuelva 500', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('boom unexpected');
    });

    await expect(POST(buildRequest())).rejects.toThrow('boom unexpected');
  });
});
