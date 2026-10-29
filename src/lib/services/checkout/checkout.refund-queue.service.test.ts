/**
 * Tests de la cola de reembolsos fallidos que consume /admin.
 *
 * Se protege que el reintento use una clave de idempotencia nueva por
 * fallo registrado (Stripe cachea los errores 24 h con la original), que
 * `charge_already_refunded` cuente como éxito (lo que hace segura la
 * clave nueva) y que solo se puedan reintentar filas de la cola.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({ refunds: { create: vi.fn() } }));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

const refundRepoMock = vi.hoisted(() => ({
  findPending: vi.fn(),
  findRefundState: vi.fn(),
  recordIssued: vi.fn(),
  recordFailed: vi.fn(),
  clearFailure: vi.fn(),
}));

vi.mock('./checkout.refund.repository', () => ({ refundRepository: refundRepoMock }));

import { BookingForCheckoutNotFoundError, RefundNotInQueueError } from './checkout.errors';
import { listPendingRefunds, retryBookingRefund } from './checkout.refund-queue.service';

const BOOKING_ID = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
const FAILED_AT = new Date('2026-10-25T12:00:00.000Z');

function queuedState(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    status: 'cancelled',
    stripePaymentIntentId: 'pi_123',
    refundFailedAt: FAILED_AT,
    refundedAt: null,
    refundDismissedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  refundRepoMock.findRefundState.mockResolvedValue(queuedState());
  stripeMock.refunds.create.mockResolvedValue({ id: 're_retry' });
});

describe('listPendingRefunds', () => {
  it('aplana los joins y resuelve el nombre del servicio en castellano', async () => {
    refundRepoMock.findPending.mockResolvedValue([
      {
        id: BOOKING_ID,
        priceCents: 4500,
        startAt: new Date('2026-10-27T10:00:00.000Z'),
        cancelledAt: new Date('2026-10-25T11:00:00.000Z'),
        refundFailedAt: FAILED_AT,
        refundFailureReason: 'balance_insufficient: Insufficient funds',
        stripePaymentIntentId: 'pi_123',
        provider: { businessName: 'Estudio Sal' },
        service: { name: { es: 'Corte y peinado', ca: 'Tall i pentinat' } },
        client: { email: 'cliente@example.com' },
      },
    ]);

    const result = await listPendingRefunds();

    expect(result).toEqual([
      {
        bookingId: BOOKING_ID,
        providerName: 'Estudio Sal',
        serviceName: 'Corte y peinado',
        clientEmail: 'cliente@example.com',
        priceCents: 4500,
        startAt: new Date('2026-10-27T10:00:00.000Z'),
        cancelledAt: new Date('2026-10-25T11:00:00.000Z'),
        refundFailedAt: FAILED_AT,
        refundFailureReason: 'balance_insufficient: Insufficient funds',
        stripePaymentIntentId: 'pi_123',
      },
    ]);
  });
});

describe('retryBookingRefund', () => {
  it('reintenta con una clave nueva derivada del último fallo', async () => {
    const result = await retryBookingRefund({ bookingId: BOOKING_ID });

    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_123', refund_application_fee: true, reverse_transfer: true },
      { idempotencyKey: `booking_refund_${BOOKING_ID}_retry_${FAILED_AT.getTime()}` },
    );
    expect(refundRepoMock.recordIssued).toHaveBeenCalledWith(BOOKING_ID, 're_retry');
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      refund: 'succeeded',
      stripeRefundId: 're_retry',
    });
  });

  it('trata charge_already_refunded como éxito y saca la fila de la cola', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('already'), { code: 'charge_already_refunded' }),
    );

    const result = await retryBookingRefund({ bookingId: BOOKING_ID });

    expect(refundRepoMock.clearFailure).toHaveBeenCalledWith(BOOKING_ID);
    expect(result).toEqual({ bookingId: BOOKING_ID, refund: 'succeeded', stripeRefundId: null });
  });

  it('devuelve failed y actualiza el motivo si Stripe vuelve a fallar', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('Insufficient funds'), { code: 'balance_insufficient' }),
    );

    const result = await retryBookingRefund({ bookingId: BOOKING_ID });

    expect(refundRepoMock.recordFailed).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.any(Date),
      'balance_insufficient: Insufficient funds',
    );
    expect(result.refund).toBe('failed');
  });

  it('lanza BookingForCheckoutNotFoundError si la reserva no existe', async () => {
    refundRepoMock.findRefundState.mockResolvedValue(null);

    await expect(retryBookingRefund({ bookingId: BOOKING_ID })).rejects.toBeInstanceOf(
      BookingForCheckoutNotFoundError,
    );
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('lanza RefundNotInQueueError si el refund nunca falló', async () => {
    refundRepoMock.findRefundState.mockResolvedValue(queuedState({ refundFailedAt: null }));

    await expect(retryBookingRefund({ bookingId: BOOKING_ID })).rejects.toBeInstanceOf(
      RefundNotInQueueError,
    );
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('lanza RefundNotInQueueError si Stripe ya confirmó el reembolso', async () => {
    refundRepoMock.findRefundState.mockResolvedValue(queuedState({ refundedAt: new Date() }));

    await expect(retryBookingRefund({ bookingId: BOOKING_ID })).rejects.toBeInstanceOf(
      RefundNotInQueueError,
    );
  });

  it('no reintenta una entrada descartada por soporte', async () => {
    refundRepoMock.findRefundState.mockResolvedValue(
      queuedState({ refundDismissedAt: new Date('2026-10-26T09:00:00.000Z') }),
    );

    await expect(retryBookingRefund({ bookingId: BOOKING_ID })).rejects.toBeInstanceOf(
      RefundNotInQueueError,
    );
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('lanza RefundNotInQueueError si la reserva sigue viva (no emite refund íntegro)', async () => {
    refundRepoMock.findRefundState.mockResolvedValue(queuedState({ status: 'confirmed' }));

    await expect(retryBookingRefund({ bookingId: BOOKING_ID })).rejects.toBeInstanceOf(
      RefundNotInQueueError,
    );
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('trata como fallo un refund que Stripe devuelve ya en failed', async () => {
    stripeMock.refunds.create.mockResolvedValue({
      id: 're_dead',
      status: 'failed',
      failure_reason: 'expired_or_canceled_card',
    });

    const result = await retryBookingRefund({ bookingId: BOOKING_ID });

    expect(refundRepoMock.recordIssued).not.toHaveBeenCalled();
    expect(refundRepoMock.recordFailed).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.any(Date),
      'refund_failed: expired_or_canceled_card',
    );
    expect(result.refund).toBe('failed');
  });

  it('devuelve not_applicable si no hay PaymentIntent que reembolsar', async () => {
    refundRepoMock.findRefundState.mockResolvedValue(queuedState({ stripePaymentIntentId: null }));

    const result = await retryBookingRefund({ bookingId: BOOKING_ID });

    expect(result.refund).toBe('not_applicable');
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('rechaza un bookingId que no sea un uuid', async () => {
    await expect(retryBookingRefund({ bookingId: 'bk-1' })).rejects.toThrow();
    expect(refundRepoMock.findRefundState).not.toHaveBeenCalled();
  });
});
