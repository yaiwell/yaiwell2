/**
 * Tests de quién admite el reembolso por incidencia: lo que dice la BD, y lo
 * que solo sabe Stripe (reembolso parcial, contracargo, Stripe caído).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  refunds: { create: vi.fn() },
  paymentIntents: { retrieve: vi.fn() },
}));
const clientMock = vi.hoisted(() => ({ getStripeClient: vi.fn() }));

vi.mock('@/lib/integrations/stripe', () => clientMock);

import {
  evaluateIncidentRefund,
  evaluateIncidentRefundWithStripe,
  INCIDENT_REFUND_RESUME_GRACE_MS,
} from './checkout.incident-refund.eligibility';
import {
  FAILED_AT,
  NOW,
  incidentRow as row,
  paidIntent,
  unfinishedRow,
} from './checkout.incident-refund.test-fixtures';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  clientMock.getStripeClient.mockReturnValue(stripeMock);
  stripeMock.paymentIntents.retrieve.mockResolvedValue(paidIntent());
});

describe('evaluateIncidentRefund', () => {
  it.each(['confirmed', 'completed'] as const)('admite una reserva online %s', (status) => {
    expect(evaluateIncidentRefund(row({ status }), NOW)).toEqual({ eligible: true, mode: 'new' });
  });

  it.each([
    ['pending', 'status'],
    ['no_show', 'status'],
    ['cancelled', 'status'],
    ['refunded', 'already_refunded'],
  ] as const)('con estado %s responde %s', (status, reason) => {
    expect(evaluateIncidentRefund(row({ status }), NOW)).toEqual({ eligible: false, reason });
  });

  it('rechaza el pago en el local aunque esté confirmada', () => {
    expect(
      evaluateIncidentRefund(row({ paymentMode: 'onsite', stripePaymentIntentId: null }), NOW),
    ).toEqual({ eligible: false, reason: 'onsite' });
  });

  it('rechaza una reserva online sin PaymentIntent', () => {
    expect(evaluateIncidentRefund(row({ stripePaymentIntentId: null }), NOW)).toEqual({
      eligible: false,
      reason: 'no_payment',
    });
  });

  it('con refundedAt o con un refund vivo, ya está devuelta', () => {
    expect(evaluateIncidentRefund(row({ refundedAt: FAILED_AT }), NOW)).toEqual({
      eligible: false,
      reason: 'already_refunded',
    });
    expect(evaluateIncidentRefund(row({ stripeRefundId: 're_0' }), NOW)).toEqual({
      eligible: false,
      reason: 'already_refunded',
    });
  });

  it('un refund fallido no se presenta como devuelto: sigue en la cola', () => {
    expect(
      evaluateIncidentRefund(
        row({ status: 'cancelled', stripeRefundId: 're_0', refundFailedAt: FAILED_AT }),
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'in_queue' });
  });

  it('una entrada descartada de la cola no vuelve a ofrecerse', () => {
    expect(
      evaluateIncidentRefund(
        row({ status: 'cancelled', refundFailedAt: FAILED_AT, refundDismissedAt: FAILED_AT }),
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'status' });
  });

  it('cancelada por incidencia sin refund ni fallo: se puede completar', () => {
    expect(evaluateIncidentRefund(unfinishedRow(), NOW)).toEqual({
      eligible: true,
      mode: 'resume',
    });
  });

  it('mientras la primera petición puede seguir en vuelo, aún no se ofrece', () => {
    const justNow = new Date(NOW.getTime() - INCIDENT_REFUND_RESUME_GRACE_MS + 1);

    expect(evaluateIncidentRefund(unfinishedRow({ incidentRefundAt: justNow }), NOW)).toEqual({
      eligible: false,
      reason: 'in_progress',
    });
  });

  it('una incidencia con el fallo en la cola se reintenta desde la cola', () => {
    expect(evaluateIncidentRefund(unfinishedRow({ refundFailedAt: FAILED_AT }), NOW)).toEqual({
      eligible: false,
      reason: 'in_queue',
    });
  });

  it('una cancelación normal, sin marca, no se puede completar', () => {
    expect(evaluateIncidentRefund(row({ status: 'cancelled' }), NOW)).toEqual({
      eligible: false,
      reason: 'status',
    });
  });
});

describe('evaluateIncidentRefundWithStripe', () => {
  it('sin problemas en Stripe sigue siendo elegible', async () => {
    await expect(evaluateIncidentRefundWithStripe(row(), NOW)).resolves.toEqual({
      eligible: true,
      mode: 'new',
    });
    expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123', {
      expand: ['latest_charge'],
    });
  });

  it('no consulta Stripe si la BD ya la descarta', async () => {
    await evaluateIncidentRefundWithStripe(row({ status: 'pending' }), NOW);

    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it('bloquea un reembolso parcial previo', async () => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue(paidIntent({ amount_refunded: 1000 }));

    await expect(evaluateIncidentRefundWithStripe(row(), NOW)).resolves.toEqual({
      eligible: false,
      reason: 'partially_refunded',
    });
  });

  it('bloquea un cargo con contracargo', async () => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue(paidIntent({ disputed: true }));

    await expect(evaluateIncidentRefundWithStripe(row(), NOW)).resolves.toEqual({
      eligible: false,
      reason: 'disputed',
    });
  });

  it('un cargo ya devuelto entero no bloquea: lo cierra la emisión', async () => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue(
      paidIntent({ amount_refunded: 4500, refunded: true }),
    );

    await expect(evaluateIncidentRefundWithStripe(row(), NOW)).resolves.toMatchObject({
      eligible: true,
    });
  });

  it('un intent sin cobro hecho no es elegible', async () => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_123',
      status: 'processing',
      latest_charge: null,
    });

    await expect(evaluateIncidentRefundWithStripe(row(), NOW)).resolves.toEqual({
      eligible: false,
      reason: 'no_payment',
    });
  });

  it('si Stripe no responde lo dice y no finge elegibilidad', async () => {
    stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('timeout'));

    await expect(evaluateIncidentRefundWithStripe(row(), NOW)).resolves.toEqual({
      eligible: false,
      reason: 'stripe_unavailable',
    });
  });

  it('si falta la clave de Stripe tampoco lanza', async () => {
    clientMock.getStripeClient.mockImplementation(() => {
      throw new Error('STRIPE_SECRET_KEY missing');
    });

    await expect(evaluateIncidentRefundWithStripe(row(), NOW)).resolves.toEqual({
      eligible: false,
      reason: 'stripe_unavailable',
    });
  });
});
