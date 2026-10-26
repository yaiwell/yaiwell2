/**
 * Tests de `charge.refund.updated` (fallos asíncronos de reembolsos).
 *
 * Un refund aceptado que pasa a `failed` debe volver a la cola de
 * /admin; cualquier otro estado se ignora.
 */

import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refundRepoMock = vi.hoisted(() => ({
  findByStripeRefundId: vi.fn(),
  recordAsyncFailure: vi.fn(),
}));

vi.mock('./checkout.refund.repository', () => ({ refundRepository: refundRepoMock }));

const repoMock = vi.hoisted(() => ({ findByPaymentIntentId: vi.fn() }));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

const warnMock = vi.hoisted(() => ({ reportCheckoutWarning: vi.fn() }));

vi.mock('./checkout.payment-intent', () => warnMock);

import { BookingForCheckoutNotFoundError } from './checkout.errors';
import { recordAsyncRefundFailure } from './checkout.refund-events.service';

const NOW = new Date('2026-10-26T10:00:00.000Z');

function refund(overrides: Record<string, unknown> = {}) {
  return {
    id: 're_1',
    status: 'failed',
    failure_reason: 'expired_or_canceled_card',
    payment_intent: 'pi_123',
    ...overrides,
  } as unknown as Stripe.Refund;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  refundRepoMock.findByStripeRefundId.mockResolvedValue({
    id: 'bk-1',
    status: 'refunded',
    stripeRefundId: 're_1',
  });
});

describe('recordAsyncRefundFailure', () => {
  it('mete en la cola la reserva de un refund fallido, localizada por stripeRefundId', async () => {
    const result = await recordAsyncRefundFailure(refund(), NOW);

    expect(refundRepoMock.findByStripeRefundId).toHaveBeenCalledWith('re_1');
    expect(refundRepoMock.recordAsyncFailure).toHaveBeenCalledWith(
      'bk-1',
      NOW,
      'refund_failed: expired_or_canceled_card',
    );
    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'cancelled' });
  });

  it('no encola un refund ajeno sobre una reserva viva (parcial manual)', async () => {
    refundRepoMock.findByStripeRefundId.mockResolvedValue(null);
    repoMock.findByPaymentIntentId.mockResolvedValue({
      id: 'bk-2',
      status: 'confirmed',
      stripeRefundId: null,
    });

    const result = await recordAsyncRefundFailure(refund(), NOW);

    expect(repoMock.findByPaymentIntentId).toHaveBeenCalledWith('pi_123');
    expect(refundRepoMock.recordAsyncFailure).not.toHaveBeenCalled();
    expect(warnMock.reportCheckoutWarning).toHaveBeenCalledWith(
      expect.any(String),
      'bk-2',
      'error',
    );
    expect(result).toEqual({ bookingId: 'bk-2', changed: false, status: 'confirmed' });
  });

  it('no encola un refund ajeno aunque la reserva esté cancelada', async () => {
    refundRepoMock.findByStripeRefundId.mockResolvedValue(null);
    repoMock.findByPaymentIntentId.mockResolvedValue({
      id: 'bk-2',
      status: 'cancelled',
      stripeRefundId: 're_nuestro',
    });

    await recordAsyncRefundFailure(refund(), NOW);

    expect(refundRepoMock.recordAsyncFailure).not.toHaveBeenCalled();
  });

  it('ignora refunds que no han fallado', async () => {
    const result = await recordAsyncRefundFailure(refund({ status: 'succeeded' }), NOW);

    expect(refundRepoMock.recordAsyncFailure).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });

  it('lanza BookingForCheckoutNotFoundError si el refund no es de ninguna reserva', async () => {
    refundRepoMock.findByStripeRefundId.mockResolvedValue(null);
    repoMock.findByPaymentIntentId.mockResolvedValue(null);

    await expect(recordAsyncRefundFailure(refund(), NOW)).rejects.toBeInstanceOf(
      BookingForCheckoutNotFoundError,
    );
  });
});
