/**
 * Tests del cron de caducidad de reservas `pending`.
 *
 * Lo crítico es la asimetría con el dinero: si Stripe dice que el
 * PaymentIntent ya no es cancelable porque se cobró, la reserva NO se
 * cancela (la resuelve el webhook). Y un fallo en una reserva no puede
 * abortar el resto del barrido. Si el pago se cobró y su webhook se
 * perdió, el barrido delega en el asentamiento y lo cuenta como `settled`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as BookingHold from '@/lib/services/booking/booking.hold';

const stripeMock = vi.hoisted(() => ({
  paymentIntents: { cancel: vi.fn(), retrieve: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

vi.mock('@/lib/services/booking', async () => {
  const hold = await vi.importActual<typeof BookingHold>('@/lib/services/booking/booking.hold');
  return { getPendingHoldCutoff: hold.getPendingHoldCutoff };
});

const repoMock = vi.hoisted(() => ({ findExpiredPending: vi.fn(), cancelIfPending: vi.fn() }));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

const lostWebhookMock = vi.hoisted(() => ({
  settleLostWebhookPayment: vi.fn(),
  reportStuckPendingBooking: vi.fn(),
}));

// El asentamiento tiene sus propios tests (`checkout.lost-webhook.service.test.ts`).
vi.mock('./checkout.lost-webhook.service', () => lostWebhookMock);

import { expireAbandonedPendingBookings } from './checkout.expiry.service';

const NOW = new Date('2026-10-26T03:00:00.000Z');

function pending(id: string, stripePaymentIntentId: string | null = `pi_${id}`) {
  return {
    id,
    status: 'pending',
    stripePaymentIntentId,
    professionalId: 'pro-1',
    startAt: new Date('2026-10-27T10:00:00.000Z'),
    endAt: new Date('2026-10-27T11:00:00.000Z'),
    createdAt: new Date('2026-10-25T18:00:00.000Z'),
  };
}

function unexpectedState() {
  return Object.assign(new Error('This PaymentIntent cannot be canceled'), {
    code: 'payment_intent_unexpected_state',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  stripeMock.paymentIntents.cancel.mockResolvedValue({ status: 'canceled' });
  repoMock.cancelIfPending.mockResolvedValue(true);
  lostWebhookMock.settleLostWebhookPayment.mockResolvedValue(null);
});

describe('expireAbandonedPendingBookings', () => {
  it('busca pending con el corte de 30 min y las caduca cancelando su intent', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1')]);

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(repoMock.findExpiredPending).toHaveBeenCalledWith(
      new Date('2026-10-26T02:30:00.000Z'),
      expect.any(Number),
    );
    expect(stripeMock.paymentIntents.cancel).toHaveBeenCalledWith(
      'pi_bk-1',
      { cancellation_reason: 'abandoned' },
      { idempotencyKey: 'booking_expire_bk-1' },
    );
    expect(repoMock.cancelIfPending).toHaveBeenCalledWith('bk-1', NOW);
    expect(summary).toEqual({
      scanned: 1,
      expired: 1,
      settled: 0,
      skipped: 0,
      failed: 0,
      settlements: [],
    });
  });

  it('no cancela la reserva si Stripe rechaza cancelar un intent ya pagado', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1')]);
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded' });

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
    expect(lostWebhookMock.settleLostWebhookPayment).toHaveBeenCalledWith(pending('bk-1'), NOW);
    expect(summary).toEqual({
      scanned: 1,
      expired: 0,
      settled: 0,
      skipped: 1,
      failed: 0,
      settlements: [],
    });
  });

  it('asienta el pago de un webhook perdido y devuelve la transición', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1')]);
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded' });
    const transition = { bookingId: 'bk-1', changed: true, status: 'confirmed' };
    lostWebhookMock.settleLostWebhookPayment.mockResolvedValue(transition);

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
    expect(summary).toEqual({
      scanned: 1,
      expired: 0,
      settled: 1,
      skipped: 0,
      failed: 0,
      settlements: [transition],
    });
  });

  it('tampoco la cancela si el pago se está procesando', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1')]);
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'processing' });

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
    expect(lostWebhookMock.settleLostWebhookPayment).not.toHaveBeenCalled();
    // Métodos asíncronos (SEPA) tardan días: solo aviso, y solo si lleva >24 h.
    expect(lostWebhookMock.reportStuckPendingBooking).toHaveBeenCalledWith(
      pending('bk-1'),
      NOW,
      expect.any(String),
      'warning',
    );
    expect(summary.skipped).toBe(1);
  });

  it('salta sin avisar un intent aún abierto que Stripe no deja cancelar (clave cacheada)', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1')]);
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'requires_payment_method' });

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(summary.skipped).toBe(1);
    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
    // Ni se intenta asentar ni se reporta «sin cargo asentable».
    expect(lostWebhookMock.settleLostWebhookPayment).not.toHaveBeenCalled();
    expect(lostWebhookMock.reportStuckPendingBooking).not.toHaveBeenCalled();
  });

  it('caduca la reserva si su intent ya estaba cancelado (idempotente)', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1')]);
    stripeMock.paymentIntents.cancel.mockRejectedValue(unexpectedState());
    stripeMock.paymentIntents.retrieve.mockResolvedValue({ status: 'canceled' });

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(repoMock.cancelIfPending).toHaveBeenCalledWith('bk-1', NOW);
    expect(summary.expired).toBe(1);
  });

  it('caduca sin llamar a Stripe una pending sin intent anclado', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1', null)]);

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(stripeMock.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(summary.expired).toBe(1);
  });

  it('cuenta como skipped si el webhook la confirmó en paralelo', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1')]);
    repoMock.cancelIfPending.mockResolvedValue(false);

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(summary).toEqual({
      scanned: 1,
      expired: 0,
      settled: 0,
      skipped: 1,
      failed: 0,
      settlements: [],
    });
  });

  it('un fallo en una reserva no aborta el resto del barrido', async () => {
    repoMock.findExpiredPending.mockResolvedValue([pending('bk-1'), pending('bk-2')]);
    stripeMock.paymentIntents.cancel
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ status: 'canceled' });

    const summary = await expireAbandonedPendingBookings({ now: NOW });

    expect(repoMock.cancelIfPending).toHaveBeenCalledTimes(1);
    expect(repoMock.cancelIfPending).toHaveBeenCalledWith('bk-2', NOW);
    expect(summary).toEqual({
      scanned: 2,
      expired: 1,
      settled: 0,
      skipped: 0,
      failed: 1,
      settlements: [],
    });
  });
});
