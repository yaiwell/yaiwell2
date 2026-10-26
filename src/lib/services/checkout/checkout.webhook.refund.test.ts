/**
 * Tests de `charge.refunded` (`refundBookingPayment`).
 *
 * Protege la transición a `refunded` (que rellena `refundedAt` y saca la
 * reserva de la cola de /admin) y, sobre todo, que no ocurra cuando el
 * dinero no ha vuelto: reembolso parcial, refund nuestro fallido, o un
 * `charge.refunded` que llega después de un fallo registrado más tarde
 * (orden de eventos invertido).
 */

import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const bookingMock = vi.hoisted(() => ({
  bookingRepository: { findById: vi.fn(), updateStatus: vi.fn() },
}));

vi.mock('@/lib/services/booking', () => ({ bookingRepository: bookingMock.bookingRepository }));

vi.mock('./checkout.repository', () => ({
  checkoutRepository: { findByPaymentIntentId: vi.fn() },
}));

const stripeMock = vi.hoisted(() => ({ refunds: { retrieve: vi.fn() } }));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

import { refundBookingPayment } from './checkout.charge-refunded.service';

const EVENT_AT = new Date('2026-10-26T10:00:00.000Z');

/** Charge reembolsado entero, con la metadata heredada del PI. */
function charge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ch_1',
    payment_intent: 'pi_123',
    refunded: true,
    metadata: { bookingId: 'bk-1' },
    ...overrides,
  } as unknown as Stripe.Charge;
}

function bookingRow(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-1',
    status,
    stripePaymentIntentId: 'pi_123',
    stripeRefundId: null,
    refundFailedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  stripeMock.refunds.retrieve.mockResolvedValue({ id: 're_1', status: 'succeeded' });
});

describe('refundBookingPayment', () => {
  it('marca como refunded una reserva confirmada y registra refundedAt', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    const result = await refundBookingPayment(charge(), { eventCreatedAt: EVENT_AT });

    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalledWith(
      'bk-1',
      'refunded',
      expect.objectContaining({ cancelledAt: expect.any(Date), refundedAt: expect.any(Date) }),
    );
    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'refunded' });
  });

  it('marca como refunded una reserva cancelada cuyo refund nuestro tuvo éxito', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(
      bookingRow('cancelled', { stripeRefundId: 're_1' }),
    );

    const result = await refundBookingPayment(charge(), { eventCreatedAt: EVENT_AT });

    // El evento no trae `charge.refunds`: se consulta el refund en Stripe.
    expect(stripeMock.refunds.retrieve).toHaveBeenCalledWith('re_1');
    expect(result.status).toBe('refunded');
  });

  it('no marca nada con un reembolso parcial', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    const result = await refundBookingPayment(charge({ refunded: false }));

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });

  it('no saca de la cola una reserva cuyo refund nuestro figura como failed en el cargo', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(
      bookingRow('cancelled', { stripeRefundId: 're_1' }),
    );

    const result = await refundBookingPayment(
      charge({ refunds: { data: [{ id: 're_1', status: 'failed' }] } }),
      { eventCreatedAt: EVENT_AT },
    );

    expect(stripeMock.refunds.retrieve).not.toHaveBeenCalled();
    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'cancelled' });
  });

  it('orden invertido: un charge.refunded anterior al fallo registrado no limpia la cola', async () => {
    // `charge.refund.updated(failed)` se procesó primero y dejó
    // `refundFailedAt` posterior a la emisión del `charge.refunded`.
    bookingMock.bookingRepository.findById.mockResolvedValue(
      bookingRow('cancelled', {
        stripeRefundId: 're_1',
        refundFailedAt: new Date(EVENT_AT.getTime() + 60_000),
      }),
    );

    const result = await refundBookingPayment(charge(), { eventCreatedAt: EVENT_AT });

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });

  it('sigue ignorando un refund sobre una reserva pending', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending'));

    const result = await refundBookingPayment(charge());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'pending' });
  });

  it('es idempotente ante un segundo charge.refunded', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('refunded'));

    const result = await refundBookingPayment(charge());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });

  it('acepta payment_intent expandido como objeto', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('completed'));

    await refundBookingPayment(charge({ payment_intent: { id: 'pi_123' } }));

    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalled();
  });
});
