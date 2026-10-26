/**
 * Tests de la cancelación del proveedor sobre una reserva `pending`.
 *
 * El PaymentIntent sigue vivo: se cancela DESPUÉS de cancelar en BD para
 * que el cliente no pueda pagar una reserva muerta. Si Stripe dice que
 * ya está cobrado (el pago entró entre la lectura y la cancelación), el
 * dinero se reembolsa en el acto: el webhook de ese pago pudo procesarse
 * ya y no volverá. Ningún fallo de Stripe tumba la cancelación.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  refunds: { create: vi.fn() },
  paymentIntents: { cancel: vi.fn(), retrieve: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

const bookingMock = vi.hoisted(() => ({ cancelBookingByProvider: vi.fn() }));

vi.mock('@/lib/services/booking', () => bookingMock);

const refundRepoMock = vi.hoisted(() => ({
  recordIssued: vi.fn(),
  recordFailed: vi.fn(),
  clearFailure: vi.fn(),
}));

vi.mock('./checkout.refund.repository', () => ({ refundRepository: refundRepoMock }));

import { cancelBookingByProviderWithRefund } from './checkout.refund.service';

const BOOKING_ID = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
const PROVIDER_USER_ID = '11112222-3333-4444-5555-666677778888';

const NOT_APPLICABLE = {
  bookingId: BOOKING_ID,
  status: 'cancelled',
  refund: 'not_applicable',
  stripeRefundId: null,
};

function cancel() {
  return cancelBookingByProviderWithRefund({ bookingId: BOOKING_ID }, PROVIDER_USER_ID);
}

function unexpectedState() {
  return Object.assign(new Error('cannot cancel'), { code: 'payment_intent_unexpected_state' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  bookingMock.cancelBookingByProvider.mockResolvedValue({
    id: BOOKING_ID,
    status: 'cancelled',
    previousStatus: 'pending',
    stripePaymentIntentId: 'pi_pending',
  });
  stripeMock.paymentIntents.cancel.mockResolvedValue({ id: 'pi_pending', status: 'canceled' });
  stripeMock.refunds.create.mockResolvedValue({ id: 're_race' });
});

describe('cancelBookingByProviderWithRefund sobre una pending', () => {
  it('cancela el PaymentIntent después de cancelar en BD, sin reembolsar', async () => {
    const result = await cancel();

    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith(
      'pi_pending',
      { cancellation_reason: 'abandoned' },
      { idempotencyKey: `booking_cancel_pi_${BOOKING_ID}` },
    );
    // Orden: BD (irreversible) primero, Stripe después.
    expect(bookingMock.cancelBookingByProvider.mock.invocationCallOrder[0]).toBeLessThan(
      stripeMock.paymentIntents.cancel.mock.invocationCallOrder[0],
    );
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(result).toEqual(NOT_APPLICABLE);
  });

  it('reembolsa en el acto si el intent ya estaba pagado (carrera con el webhook)', async () => {
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded' });

    const result = await cancel();

    // Misma clave que el pago tardío: si ambos disparan, un solo refund.
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_pending', refund_application_fee: true, reverse_transfer: true },
      { idempotencyKey: `booking_refund_${BOOKING_ID}` },
    );
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: 'cancelled',
      refund: 'issued',
      stripeRefundId: 're_race',
    });
  });

  it('no reembolsa si el pago aún se está procesando (lo cubre el webhook)', async () => {
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'processing' });

    const result = await cancel();

    expect(console.warn).toHaveBeenCalled();
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(result).toEqual(NOT_APPLICABLE);
  });

  it('error genérico al cancelar y el intent resulta cobrado: reembolsa', async () => {
    stripeMock.paymentIntents.cancel.mockRejectedValue(new Error('ECONNRESET'));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded' });

    const result = await cancel();

    expect(stripeMock.refunds.create).toHaveBeenCalled();
    expect(refundRepoMock.recordFailed).not.toHaveBeenCalled();
    expect(result.refund).toBe('issued');
  });

  it('error genérico al cancelar y al consultar: no lanza y encola para admin', async () => {
    stripeMock.paymentIntents.cancel.mockRejectedValue(
      Object.assign(new Error('boom'), { code: 'api_connection_error' }),
    );
    stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('ECONNRESET'));

    const result = await cancel();

    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(refundRepoMock.recordFailed).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.any(Date),
      'pi_cancel_failed: api_connection_error',
    );
    expect(result).toEqual({ ...NOT_APPLICABLE, refund: 'failed' });
  });

  it('error genérico al cancelar y el intent sigue sin pagar: encola (no concluyente)', async () => {
    stripeMock.paymentIntents.cancel.mockRejectedValue(new Error('ECONNRESET'));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'requires_payment_method' });

    const result = await cancel();

    expect(refundRepoMock.recordFailed).toHaveBeenCalled();
    expect(result.refund).toBe('failed');
  });

  it('error genérico al cancelar pero el intent quedó cancelado: not_applicable', async () => {
    stripeMock.paymentIntents.cancel.mockRejectedValue(new Error('ECONNRESET'));
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'canceled' });

    const result = await cancel();

    expect(refundRepoMock.recordFailed).not.toHaveBeenCalled();
    expect(result).toEqual(NOT_APPLICABLE);
  });
});
