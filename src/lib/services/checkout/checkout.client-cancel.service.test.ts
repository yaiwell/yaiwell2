/**
 * Tests de la cancelación del cliente con reembolso íntegro.
 *
 * Comparte maquinaria con la del proveedor (`settleCancelledBookingPayment`),
 * así que aquí se fija el contrato desde el lado del cliente: las reglas
 * preceden al dinero, el refund sale con los parámetros de Connect y la
 * clave automática, y ningún fallo de Stripe deshace la cancelación.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  refunds: { create: vi.fn() },
  paymentIntents: { cancel: vi.fn(), retrieve: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

const bookingMock = vi.hoisted(() => {
  class LastMinuteBookingNotCancellableError extends Error {
    readonly code = 'LAST_MINUTE_BOOKING_NOT_CANCELLABLE';
  }
  class BookingNotCancellableError extends Error {
    readonly code = 'BOOKING_NOT_CANCELLABLE';
  }
  return {
    cancelBookingByClient: vi.fn(),
    LastMinuteBookingNotCancellableError,
    BookingNotCancellableError,
  };
});

vi.mock('@/lib/services/booking', () => bookingMock);

const refundRepoMock = vi.hoisted(() => ({
  recordIssued: vi.fn(),
  recordFailed: vi.fn(),
  clearFailure: vi.fn(),
}));

vi.mock('./checkout.refund.repository', () => ({ refundRepository: refundRepoMock }));

import { cancelBookingByClientWithRefund } from './checkout.client-cancel.service';

const BOOKING_ID = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
const CLIENT_USER_ID = 'user-client';

function cancelledRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    status: 'cancelled',
    previousStatus: 'confirmed',
    stripePaymentIntentId: 'pi_123',
    slotOfferId: null,
    ...overrides,
  };
}

function cancel() {
  return cancelBookingByClientWithRefund({ bookingId: BOOKING_ID }, CLIENT_USER_ID);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  bookingMock.cancelBookingByClient.mockResolvedValue(cancelledRow());
  stripeMock.refunds.create.mockResolvedValue({ id: 're_1', status: 'succeeded' });
});

describe('cancelBookingByClientWithRefund', () => {
  it('cancela con el User.id del cliente y emite el refund íntegro (issued)', async () => {
    const result = await cancel();

    expect(bookingMock.cancelBookingByClient).toHaveBeenCalledWith(
      { bookingId: BOOKING_ID },
      CLIENT_USER_ID,
    );
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_123', refund_application_fee: true, reverse_transfer: true },
      { idempotencyKey: `booking_refund_${BOOKING_ID}` },
    );
    // BD (irreversible) antes que Stripe (reintentable).
    expect(bookingMock.cancelBookingByClient.mock.invocationCallOrder[0]).toBeLessThan(
      stripeMock.refunds.create.mock.invocationCallOrder[0],
    );
    expect(refundRepoMock.recordIssued).toHaveBeenCalledWith(BOOKING_ID, 're_1');
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: 'cancelled',
      refund: 'issued',
      stripeRefundId: 're_1',
      offerReopened: false,
    });
  });

  it('marca la oferta como reabierta si la reserva se vendió con descuento', async () => {
    bookingMock.cancelBookingByClient.mockResolvedValue(cancelledRow({ slotOfferId: 'offer-1' }));

    await expect(cancel()).resolves.toMatchObject({ offerReopened: true });
  });

  it('si la reserva cambió en paralelo (escritura sin filas), ni Stripe ni avisos', async () => {
    bookingMock.cancelBookingByClient.mockRejectedValue(
      new bookingMock.BookingNotCancellableError(),
    );

    await expect(cancel()).rejects.toBeInstanceOf(bookingMock.BookingNotCancellableError);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('si Stripe falla, la reserva sigue cancelada y entra en la cola (failed)', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('Insufficient funds'), { code: 'balance_insufficient' }),
    );

    const result = await cancel();

    expect(result.refund).toBe('failed');
    expect(result.status).toBe('cancelled');
    expect(refundRepoMock.recordFailed).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.any(Date),
      'balance_insufficient: Insufficient funds',
    );
  });

  it('un refund devuelto ya fallido también va a la cola', async () => {
    stripeMock.refunds.create.mockResolvedValue({
      id: 're_x',
      status: 'failed',
      failure_reason: 'expired_or_canceled_card',
    });

    const result = await cancel();

    expect(result.refund).toBe('failed');
    expect(refundRepoMock.recordFailed).toHaveBeenCalledWith(
      BOOKING_ID,
      expect.any(Date),
      'refund_failed: expired_or_canceled_card',
    );
  });

  it('charge_already_refunded cuenta como éxito y limpia la cola', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('already'), { code: 'charge_already_refunded' }),
    );

    const result = await cancel();

    expect(result.refund).toBe('already_refunded');
    expect(refundRepoMock.clearFailure).toHaveBeenCalledWith(BOOKING_ID);
  });

  it('sin PaymentIntent (pago en el local, futuro) cancela sin reembolso', async () => {
    bookingMock.cancelBookingByClient.mockResolvedValue(
      cancelledRow({ stripePaymentIntentId: null }),
    );

    const result = await cancel();

    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(result.refund).toBe('not_applicable');
  });

  it('sobre una pending propia cancela el PaymentIntent sin reembolsar', async () => {
    bookingMock.cancelBookingByClient.mockResolvedValue(
      cancelledRow({ previousStatus: 'pending' }),
    );
    stripeMock.paymentIntents.cancel.mockResolvedValue({ id: 'pi_123', status: 'canceled' });

    const result = await cancel();

    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith(
      'pi_123',
      { cancellation_reason: 'abandoned' },
      { idempotencyKey: `booking_cancel_pi_${BOOKING_ID}` },
    );
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(result.refund).toBe('not_applicable');
  });

  it('pending sin poder confirmar el intent: encola y marca el pago como incierto', async () => {
    bookingMock.cancelBookingByClient.mockResolvedValue(
      cancelledRow({ previousStatus: 'pending' }),
    );
    stripeMock.paymentIntents.cancel.mockRejectedValue(new Error('ECONNRESET'));
    stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('ECONNRESET'));

    const result = await cancel();

    expect(result).toMatchObject({ refund: 'failed', paymentUncertain: true });
    expect(refundRepoMock.recordFailed).toHaveBeenCalled();
    // Los logs dicen quién canceló, para que soporte sepa el origen.
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('after client cancellation'),
      BOOKING_ID,
      'unknown_error',
    );
  });

  it('si la regla rechaza la cancelación, Stripe ni se entera', async () => {
    bookingMock.cancelBookingByClient.mockRejectedValue(
      new bookingMock.LastMinuteBookingNotCancellableError(),
    );

    await expect(cancel()).rejects.toBeInstanceOf(bookingMock.LastMinuteBookingNotCancellableError);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('rechaza un bookingId inválido antes de tocar el dominio', async () => {
    await expect(
      cancelBookingByClientWithRefund({ bookingId: 'x' }, CLIENT_USER_ID),
    ).rejects.toThrow();
    expect(bookingMock.cancelBookingByClient).not.toHaveBeenCalled();
  });
});
