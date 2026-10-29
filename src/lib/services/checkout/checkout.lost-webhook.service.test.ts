/**
 * Tests del asentamiento de pagos con el webhook perdido.
 *
 * Lo que se protege: el cron solo asienta un PaymentIntent realmente
 * cobrado, pasado el margen que damos al webhook, con el instante real
 * del cargo como `paidAt` (mismas reglas de retención que el webhook), y
 * siempre lo sube a Sentry como `error`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({ paymentIntents: { retrieve: vi.fn() } }));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

const sentry = vi.hoisted(() => ({ enabled: { value: true }, captureMessage: vi.fn() }));
vi.mock('@/lib/integrations/sentry', () => ({ isSentryEnabled: () => sentry.enabled.value }));
vi.mock('@sentry/nextjs', () => ({ captureMessage: sentry.captureMessage }));

const webhookMock = vi.hoisted(() => ({ confirmBookingPayment: vi.fn() }));
vi.mock('./checkout.webhook.service', () => webhookMock);

import {
  LOST_WEBHOOK_GRACE_MS,
  reportStuckPendingBooking,
  settleLostWebhookPayment,
} from './checkout.lost-webhook.service';
import type { CheckoutBookingRow } from './checkout.repository';

const NOW = new Date('2026-10-27T03:00:00.000Z');

function booking(overrides: Partial<CheckoutBookingRow> = {}): CheckoutBookingRow {
  return {
    id: 'bk-1',
    status: 'pending',
    stripePaymentIntentId: 'pi_1',
    professionalId: 'pro-1',
    startAt: new Date('2026-10-28T10:00:00.000Z'),
    endAt: new Date('2026-10-28T11:00:00.000Z'),
    createdAt: new Date('2026-10-26T18:00:00.000Z'),
    stripeRefundId: null,
    refundFailedAt: null,
    refundFailureReason: null,
    ...overrides,
  } as CheckoutBookingRow;
}

/** PaymentIntent cobrado con su cargo expandido. */
function paidIntent(chargeCreated: Date, chargeOverrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_1',
    status: 'succeeded',
    metadata: { bookingId: 'bk-1' },
    latest_charge: {
      id: 'ch_1',
      created: Math.floor(chargeCreated.getTime() / 1000),
      amount: 4500,
      amount_refunded: 0,
      refunded: false,
      ...chargeOverrides,
    },
  };
}

/** Deja correr el import diferido de Sentry. */
async function flushSentry() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  sentry.enabled.value = true;
});

describe('settleLostWebhookPayment', () => {
  it('asienta con la lógica del webhook usando el instante real del cargo', async () => {
    const paidAt = new Date('2026-10-26T18:10:00.000Z');
    const intent = paidIntent(paidAt);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(intent);
    webhookMock.confirmBookingPayment.mockResolvedValue({
      bookingId: 'bk-1',
      changed: true,
      status: 'confirmed',
    });

    const result = await settleLostWebhookPayment(booking(), NOW);

    expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith('pi_1', {
      expand: ['latest_charge'],
    });
    expect(webhookMock.confirmBookingPayment).toHaveBeenCalledWith(intent, { paidAt, now: NOW });
    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'confirmed' });
    await flushSentry();
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('never processed'),
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('da margen al webhook si el cobro es reciente', async () => {
    const paidAt = new Date(NOW.getTime() - LOST_WEBHOOK_GRACE_MS + 60_000);
    stripeMock.paymentIntents.retrieve.mockResolvedValue(paidIntent(paidAt));

    const result = await settleLostWebhookPayment(booking(), NOW);

    expect(result).toBeNull();
    expect(webhookMock.confirmBookingPayment).not.toHaveBeenCalled();
  });

  it('no asienta un intent sin cargo y lo reporta si la reserva lleva >24 h', async () => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_1',
      status: 'requires_capture',
      latest_charge: null,
    });

    const stale = booking({ createdAt: new Date('2026-10-25T18:00:00.000Z') });
    const result = await settleLostWebhookPayment(stale, NOW);

    expect(result).toBeNull();
    expect(webhookMock.confirmBookingPayment).not.toHaveBeenCalled();
    await flushSentry();
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('pending for over 24h'),
      expect.objectContaining({ level: 'error' }),
    );
  });

  it.each([
    ['reembolsado entero', { refunded: true, amount_refunded: 4500 }],
    ['reembolsado en parte', { amount_refunded: 1000 }],
  ])('no asienta un cargo %s: ni confirma ni reembolsa', async (_label, chargeOverrides) => {
    const paidAt = new Date('2026-10-25T18:10:00.000Z');
    stripeMock.paymentIntents.retrieve.mockResolvedValue(paidIntent(paidAt, chargeOverrides));
    const stale = booking({ createdAt: new Date('2026-10-25T18:00:00.000Z') });

    const result = await settleLostWebhookPayment(stale, NOW);

    expect(result).toBeNull();
    expect(webhookMock.confirmBookingPayment).not.toHaveBeenCalled();
    await flushSentry();
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('charge already refunded'),
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('no consulta Stripe si la reserva no tiene intent anclado', async () => {
    expect(
      await settleLostWebhookPayment(booking({ stripePaymentIntentId: null }), NOW),
    ).toBeNull();
    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it('propaga el error de Stripe para que el cron lo cuente como failed', async () => {
    stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('ECONNRESET'));

    await expect(settleLostWebhookPayment(booking(), NOW)).rejects.toThrow('ECONNRESET');
  });
});

describe('reportStuckPendingBooking', () => {
  it('no reporta una pending de menos de 24 h', async () => {
    reportStuckPendingBooking(
      booking({ createdAt: new Date('2026-10-26T12:00:00.000Z') }),
      NOW,
      'x',
    );
    await flushSentry();
    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('reporta con el nivel indicado a partir de 24 h', async () => {
    reportStuckPendingBooking(
      booking({ createdAt: new Date('2026-10-25T12:00:00.000Z') }),
      NOW,
      'processing',
      'warning',
    );
    await flushSentry();
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('processing'),
      expect.objectContaining({
        level: 'warning',
        tags: { domain: 'checkout', bookingId: 'bk-1' },
      }),
    );
  });
});
