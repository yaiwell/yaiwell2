/**
 * Tests de la comprobación previa al pago.
 *
 * Lo crítico: no dejar pagar una reserva cuya retención venció (y
 * caducarla en el momento para que su PaymentIntent deje de aceptar
 * pagos), sin confundir con "vencida" una reserva que el cliente ya pagó.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import type * as BookingHold from '@/lib/services/booking/booking.hold';

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { cancel: vi.fn(), retrieve: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

vi.mock('@/lib/services/booking', async () => {
  const hold = await vi.importActual<typeof BookingHold>('@/lib/services/booking/booking.hold');
  return {
    isBookingHoldingSlot: hold.isBookingHoldingSlot,
    PENDING_HOLD_PAYMENT_MARGIN_MS: hold.PENDING_HOLD_PAYMENT_MARGIN_MS,
  };
});

const repoMock = vi.hoisted(() => ({
  findOwnedCheckoutRow: vi.fn(),
  findCheckoutRow: vi.fn(),
  cancelIfPending: vi.fn(),
}));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

import { BookingForCheckoutNotFoundError, BookingHoldExpiredError } from './checkout.errors';
import { checkBookingPayable } from './checkout.hold-check.service';

const BOOKING_ID = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
const CLIENT_ID = 'client-1';
const NOW = new Date('2026-10-29T10:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    status: 'pending',
    stripePaymentIntentId: 'pi_1',
    professionalId: 'pro-1',
    startAt: new Date('2026-10-29T14:00:00.000Z'),
    endAt: new Date('2026-10-29T15:00:00.000Z'),
    // 10 min antes de NOW: dentro de la retención de 30 min.
    createdAt: new Date('2026-10-29T09:50:00.000Z'),
    stripeRefundId: null,
    refundFailedAt: null,
    refundFailureReason: null,
    ...overrides,
  };
}

/** Pending creada hace 40 min: retención vencida. */
const STALE = { createdAt: new Date('2026-10-29T09:20:00.000Z') };

function check() {
  return checkBookingPayable({ bookingId: BOOKING_ID }, CLIENT_ID, { now: NOW });
}

function unexpectedState() {
  return Object.assign(new Error('cannot cancel'), { code: 'payment_intent_unexpected_state' });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  stripeMock.paymentIntents.cancel.mockResolvedValue({ status: 'canceled' });
  repoMock.cancelIfPending.mockResolvedValue(true);
});

describe('checkBookingPayable', () => {
  it('deja pagar una pending que retiene su franja, sin tocar Stripe', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row());

    expect(await check()).toBe('payable');
    expect(repoMock.findOwnedCheckoutRow).toHaveBeenCalledWith(BOOKING_ID, CLIENT_ID);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('con la retención vencida caduca la reserva y lanza BookingHoldExpiredError', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row(STALE));

    await expect(check()).rejects.toBeInstanceOf(BookingHoldExpiredError);
    // Misma clave que el cron: si coinciden, Stripe ve una sola petición.
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith(
      'pi_1',
      { cancellation_reason: 'abandoned' },
      { idempotencyKey: `booking_expire_${BOOKING_ID}` },
    );
    expect(repoMock.cancelIfPending).toHaveBeenCalledWith(BOOKING_ID, NOW);
  });

  it('si Stripe ya la cobró (otra pestaña) responde already_paid', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row(STALE));
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded' });

    expect(await check()).toBe('already_paid');
    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
  });

  it('si el pago está en curso (processing) responde already_paid', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row(STALE));
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'processing' });

    expect(await check()).toBe('already_paid');
    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
  });

  it('con menos de 2 min de retención ya no deja empezar a pagar', async () => {
    // Creada hace 28 min 30 s: quedan 90 s de retención.
    repoMock.findOwnedCheckoutRow.mockResolvedValue(
      row({ createdAt: new Date('2026-10-29T09:31:30.000Z') }),
    );

    await expect(check()).rejects.toBeInstanceOf(BookingHoldExpiredError);
    // La caduca ya: así el propio cliente puede volver a coger la franja.
    expect(repoMock.cancelIfPending).toHaveBeenCalledWith(BOOKING_ID, NOW);
  });

  it('con 2 min o más de retención deja pagar', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(
      row({ createdAt: new Date('2026-10-29T09:32:00.000Z') }),
    );

    expect(await check()).toBe('payable');
  });

  it('un intent aún abierto que Stripe no deja cancelar cuenta como vencido, no como pagado', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row(STALE));
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'requires_payment_method' });

    await expect(check()).rejects.toBeInstanceOf(BookingHoldExpiredError);
    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
  });

  it('si el webhook la confirmó en paralelo responde already_paid', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row(STALE));
    repoMock.cancelIfPending.mockResolvedValue(false);
    repoMock.findCheckoutRow.mockResolvedValue(row({ status: 'confirmed' }));

    expect(await check()).toBe('already_paid');
  });

  it('un fallo de Stripe al caducar no impide avisar de la retención vencida', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row(STALE));
    stripeMock.paymentIntents.cancel.mockRejectedValue(new Error('ECONNRESET'));

    await expect(check()).rejects.toBeInstanceOf(BookingHoldExpiredError);
  });

  it.each(['confirmed', 'completed'])('una reserva %s ya está pagada', async (status) => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row({ status }));
    expect(await check()).toBe('already_paid');
  });

  it.each(['cancelled', 'refunded'])('una reserva %s no se puede pagar', async (status) => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(row({ status }));

    await expect(check()).rejects.toBeInstanceOf(BookingHoldExpiredError);
    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('no distingue una reserva ajena de una inexistente', async () => {
    repoMock.findOwnedCheckoutRow.mockResolvedValue(null);
    await expect(check()).rejects.toBeInstanceOf(BookingForCheckoutNotFoundError);
  });

  it('valida el id con Zod antes de tocar BD', async () => {
    await expect(checkBookingPayable({ bookingId: 'x' }, CLIENT_ID)).rejects.toBeInstanceOf(
      ZodError,
    );
    expect(repoMock.findOwnedCheckoutRow).not.toHaveBeenCalled();
  });
});
