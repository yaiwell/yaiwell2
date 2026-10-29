/**
 * Tests de las transiciones disparadas por `payment_intent.*`.
 *
 * El foco está en las dos propiedades que hacen seguro un webhook:
 * **idempotencia** (Stripe reentrega eventos) y **no resurrección** (un
 * evento tardío no revive una reserva ya cancelada o reembolsada). Los
 * casos de pago tardío viven en `checkout.late-payment.service.test.ts`
 * y los de `charge.refunded` en `checkout.webhook.refund.test.ts`.
 */

import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as BookingHold from '@/lib/services/booking/booking.hold';

const bookingMock = vi.hoisted(() => ({
  bookingRepository: { findById: vi.fn(), updateStatus: vi.fn(), findOverlapping: vi.fn() },
}));

vi.mock('@/lib/services/booking', async () => {
  const hold = await vi.importActual<typeof BookingHold>('@/lib/services/booking/booking.hold');
  return {
    bookingRepository: bookingMock.bookingRepository,
    isBookingHoldingSlot: hold.isBookingHoldingSlot,
  };
});

const repoMock = vi.hoisted(() => ({
  findByPaymentIntentId: vi.fn(),
  confirmIfPending: vi.fn(),
  cancelIfPending: vi.fn(),
  findCheckoutRow: vi.fn(),
  attachPaymentIntent: vi.fn(),
}));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

const stripeMock = vi.hoisted(() => ({ refunds: { create: vi.fn() } }));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

vi.mock('./checkout.refund.repository', () => ({
  refundRepository: { recordIssued: vi.fn(), recordFailed: vi.fn(), clearFailure: vi.fn() },
}));

import { BookingForCheckoutNotFoundError, MissingBookingReferenceError } from './checkout.errors';
import { confirmBookingPayment, failBookingPayment } from './checkout.webhook.service';

/** PaymentIntent mínimo con la metadata que escribe el checkout. */
function intent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_123',
    metadata: { bookingId: 'bk-1' },
    ...overrides,
  } as unknown as Stripe.PaymentIntent;
}

const NOW = new Date('2026-10-26T10:00:00.000Z');
const CLOCK = { now: NOW, paidAt: NOW };

/** Reserva creada hace 5 min respecto a `NOW`, para mañana. */
function bookingRow(status: string, stripePaymentIntentId: string | null = 'pi_123') {
  return {
    id: 'bk-1',
    status,
    stripePaymentIntentId,
    professionalId: 'pro-1',
    startAt: new Date('2026-10-27T10:00:00.000Z'),
    endAt: new Date('2026-10-27T11:00:00.000Z'),
    stripeRefundId: null,
    refundFailedAt: null,
    refundFailureReason: null,
    createdAt: new Date(NOW.getTime() - 5 * 60 * 1000),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  stripeMock.refunds.create.mockResolvedValue({ id: 're_late' });
  bookingMock.bookingRepository.findOverlapping.mockResolvedValue([]);
  repoMock.confirmIfPending.mockResolvedValue(true);
});

describe('confirmBookingPayment', () => {
  it('confirma una pending en retención con escritura condicional', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending'));

    const result = await confirmBookingPayment(intent(), CLOCK);

    expect(repoMock.confirmIfPending).toHaveBeenCalledWith('bk-1');
    // Nunca un update a ciegas: podría resucitar una reserva cancelada.
    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    // Dentro de la retención ni siquiera hace falta mirar la franja.
    expect(bookingMock.bookingRepository.findOverlapping).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'confirmed' });
  });

  it('es idempotente si la reserva ya estaba confirmada', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    const result = await confirmBookingPayment(intent(), CLOCK);

    expect(repoMock.confirmIfPending).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });

  it('no resucita una reserva cancelada y reembolsa el pago tardío', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('cancelled'));

    const result = await confirmBookingPayment(intent(), CLOCK);

    expect(repoMock.confirmIfPending).not.toHaveBeenCalled();
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_123', refund_application_fee: true, reverse_transfer: true },
      { idempotencyKey: 'booking_refund_bk-1' },
    );
    expect(result).toEqual({
      bookingId: 'bk-1',
      changed: false,
      status: 'cancelled',
      lateRefund: 'issued',
    });
  });

  it('ignora un succeeded sobre una reserva ya reembolsada', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('refunded'));

    const result = await confirmBookingPayment(intent(), CLOCK);

    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'refunded' });
  });

  it('rechaza el evento si el intent no coincide con el anclado en la reserva', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending', 'pi_otro'));

    await expect(confirmBookingPayment(intent(), CLOCK)).rejects.toBeInstanceOf(
      BookingForCheckoutNotFoundError,
    );
  });

  it('lanza BookingForCheckoutNotFoundError si el bookingId no existe', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(null);

    await expect(confirmBookingPayment(intent(), CLOCK)).rejects.toBeInstanceOf(
      BookingForCheckoutNotFoundError,
    );
  });

  it('cae a buscar por PaymentIntent cuando falta la metadata', async () => {
    repoMock.findByPaymentIntentId.mockResolvedValue(bookingRow('pending'));

    const result = await confirmBookingPayment(intent({ metadata: {} }), CLOCK);

    expect(repoMock.findByPaymentIntentId).toHaveBeenCalledWith('pi_123');
    expect(result.changed).toBe(true);
  });

  it('lanza MissingBookingReferenceError si no hay metadata ni id de intent', async () => {
    await expect(
      confirmBookingPayment(intent({ metadata: {}, id: undefined }), CLOCK),
    ).rejects.toBeInstanceOf(MissingBookingReferenceError);
  });
});

describe('confirmBookingPayment ante reentregas del mismo evento', () => {
  it('confirmada: la segunda entrega no cambia nada ni pide aviso', async () => {
    bookingMock.bookingRepository.findById
      .mockResolvedValueOnce(bookingRow('pending'))
      .mockResolvedValueOnce(bookingRow('confirmed'));

    const first = await confirmBookingPayment(intent(), CLOCK);
    const second = await confirmBookingPayment(intent(), CLOCK);

    expect(first).toEqual({ bookingId: 'bk-1', changed: true, status: 'confirmed' });
    // `changed: false` es lo que impide al route repetir el correo.
    expect(second).toEqual({ bookingId: 'bk-1', changed: false, status: 'confirmed' });
    expect(repoMock.confirmIfPending).toHaveBeenCalledTimes(1);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('cancelada: la segunda entrega ve already_refunded y no pide otro aviso', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('cancelled'));
    stripeMock.refunds.create
      .mockResolvedValueOnce({ id: 're_late', status: 'succeeded' })
      .mockRejectedValueOnce(
        Object.assign(new Error('Charge has already been refunded.'), {
          code: 'charge_already_refunded',
        }),
      );

    const first = await confirmBookingPayment(intent(), CLOCK);
    const second = await confirmBookingPayment(intent(), CLOCK);

    expect(first).toMatchObject({ status: 'cancelled', lateRefund: 'issued' });
    expect(second).toEqual({ bookingId: 'bk-1', changed: false, status: 'cancelled' });
    expect(second).not.toHaveProperty('lateRefund');
  });
});

describe('failBookingPayment', () => {
  it('no cancela la pendiente: el cliente puede reintentar sobre el mismo intent', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending'));

    const result = await failBookingPayment(intent());

    // La caducidad (retención de 30 min + cron) es quien la libera.
    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'pending' });
  });

  it('un reintento que paga tras un fallo confirma la reserva', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending'));
    await failBookingPayment(intent());

    repoMock.confirmIfPending.mockResolvedValue(true);
    const result = await confirmBookingPayment(intent(), CLOCK);

    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'confirmed' });
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('no toca una reserva ya confirmada', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    const result = await failBookingPayment(intent());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'confirmed' });
  });

  it('propaga la reserva no resoluble para que el route responda 200 sin tocar nada', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(null);

    await expect(failBookingPayment(intent())).rejects.toBeInstanceOf(
      BookingForCheckoutNotFoundError,
    );
  });
});
