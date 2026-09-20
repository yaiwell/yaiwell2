/**
 * Tests de la cancelación del proveedor con reembolso al cliente.
 *
 * Lo que se protege aquí no es el happy path, sino el orden y las
 * asimetrías del flujo:
 *  - La regla de negocio precede al dinero: si la cancelación no es
 *    legal, Stripe ni se entera.
 *  - El refund va con `reverse_transfer` (destination charges) o la
 *    plataforma acaba pagando el payout del proveedor.
 *  - Un fallo de Stripe NO revierte la cancelación.
 *  - `charge_already_refunded` es éxito, no error.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  refunds: { create: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => stripeMock,
}));

const bookingMock = vi.hoisted(() => {
  /** Réplicas mínimas de los errores tipados del dominio booking. */
  class BookingNotCancellableError extends Error {
    readonly code = 'BOOKING_NOT_CANCELLABLE';
  }
  class BookingTooLateToCancelError extends Error {
    readonly code = 'BOOKING_TOO_LATE_TO_CANCEL';
  }

  return {
    cancelBookingByProvider: vi.fn(),
    bookingRepository: { findById: vi.fn() },
    BookingNotCancellableError,
    BookingTooLateToCancelError,
  };
});

vi.mock('@/lib/services/booking', () => ({
  cancelBookingByProvider: bookingMock.cancelBookingByProvider,
  bookingRepository: bookingMock.bookingRepository,
  BookingNotCancellableError: bookingMock.BookingNotCancellableError,
  BookingTooLateToCancelError: bookingMock.BookingTooLateToCancelError,
}));

import { cancelBookingByProviderWithRefund } from './checkout.refund.service';

const BOOKING_ID = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
const PROVIDER_USER_ID = '11112222-3333-4444-5555-666677778888';
const PAYMENT_INTENT_ID = 'pi_123';

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    status: 'confirmed',
    stripePaymentIntentId: PAYMENT_INTENT_ID,
    startAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    ...overrides,
  };
}

/** Error de Stripe tal y como lo entrega el SDK (code en la raíz). */
function stripeError(code: string) {
  return Object.assign(new Error(code), { code, type: 'StripeInvalidRequestError' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow());
  bookingMock.cancelBookingByProvider.mockResolvedValue({ id: BOOKING_ID, status: 'cancelled' });
  stripeMock.refunds.create.mockResolvedValue({ id: 're_123' });
});

describe('cancelBookingByProviderWithRefund', () => {
  it('reembolsa una reserva confirmada revirtiendo la transferencia al centro', async () => {
    const result = await cancelBookingByProviderWithRefund(
      { bookingId: BOOKING_ID },
      PROVIDER_USER_ID,
    );

    expect(stripeMock.refunds.create).toHaveBeenCalledTimes(1);
    const [payload, options] = stripeMock.refunds.create.mock.calls[0];
    expect(payload).toEqual({
      payment_intent: PAYMENT_INTENT_ID,
      refund_application_fee: true,
      // Sin `reverse_transfer` el neto se quedaría en la cuenta del
      // centro y la plataforma pagaría el reembolso de su bolsillo.
      reverse_transfer: true,
    });
    expect(options).toEqual({ idempotencyKey: `booking_refund_${BOOKING_ID}` });

    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: 'cancelled',
      refund: 'issued',
      stripeRefundId: 're_123',
    });
  });

  it('no emite un segundo reembolso si la reserva ya estaba cancelada', async () => {
    // Segunda pulsación de "Cancelar": el dominio booking corta por
    // estado y el dinero ni se toca.
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow({ status: 'cancelled' }));
    bookingMock.cancelBookingByProvider.mockRejectedValue(
      new bookingMock.BookingNotCancellableError(),
    );

    await expect(
      cancelBookingByProviderWithRefund({ bookingId: BOOKING_ID }, PROVIDER_USER_ID),
    ).rejects.toBeInstanceOf(bookingMock.BookingNotCancellableError);

    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('trata charge_already_refunded como éxito y no lanza', async () => {
    stripeMock.refunds.create.mockRejectedValue(stripeError('charge_already_refunded'));

    const result = await cancelBookingByProviderWithRefund(
      { bookingId: BOOKING_ID },
      PROVIDER_USER_ID,
    );

    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: 'cancelled',
      refund: 'already_refunded',
      stripeRefundId: null,
    });
  });

  it('mantiene la cancelación aunque Stripe se caiga', async () => {
    stripeMock.refunds.create.mockRejectedValue(new Error('ECONNRESET'));

    const result = await cancelBookingByProviderWithRefund(
      { bookingId: BOOKING_ID },
      PROVIDER_USER_ID,
    );

    // La cancelación es irreversible (el hueco ya está libre): no se
    // revierte, se reporta el refund pendiente.
    expect(bookingMock.cancelBookingByProvider).toHaveBeenCalledWith(
      { bookingId: BOOKING_ID },
      PROVIDER_USER_ID,
    );
    expect(result).toEqual({
      bookingId: BOOKING_ID,
      status: 'cancelled',
      refund: 'failed',
      stripeRefundId: null,
    });
  });

  it('no llama a Stripe si la reserva estaba pending (nunca se cobró)', async () => {
    // `pending` con intent anclado es el caso real: el checkout ancla el
    // PaymentIntent al crear la reserva, antes de que el cliente pague.
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow({ status: 'pending' }));

    const result = await cancelBookingByProviderWithRefund(
      { bookingId: BOOKING_ID },
      PROVIDER_USER_ID,
    );

    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(result.refund).toBe('not_applicable');
    expect(result.stripeRefundId).toBeNull();
  });

  it('no llama a Stripe si la reserva no tiene PaymentIntent anclado', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(
      bookingRow({ stripePaymentIntentId: null }),
    );

    const result = await cancelBookingByProviderWithRefund(
      { bookingId: BOOKING_ID },
      PROVIDER_USER_ID,
    );

    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(result.refund).toBe('not_applicable');
  });

  it('propaga BookingTooLateToCancelError sin tocar el dinero', async () => {
    // A 1 h 59 min del inicio: la regla de negocio precede al refund.
    bookingMock.bookingRepository.findById.mockResolvedValue(
      bookingRow({ startAt: new Date(Date.now() + 119 * 60 * 1000) }),
    );
    bookingMock.cancelBookingByProvider.mockRejectedValue(
      new bookingMock.BookingTooLateToCancelError(),
    );

    await expect(
      cancelBookingByProviderWithRefund({ bookingId: BOOKING_ID }, PROVIDER_USER_ID),
    ).rejects.toBeInstanceOf(bookingMock.BookingTooLateToCancelError);

    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('rechaza un bookingId que no sea un uuid', async () => {
    await expect(
      cancelBookingByProviderWithRefund({ bookingId: 'bk-1' }, PROVIDER_USER_ID),
    ).rejects.toThrow();

    expect(bookingMock.cancelBookingByProvider).not.toHaveBeenCalled();
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });
});
