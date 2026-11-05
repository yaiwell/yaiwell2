/**
 * Tests del reembolso por incidencia del centro.
 *
 * Se protege: que `completed` pase por `cancelled` (lo único que la cola sabe
 * reintentar), que una segunda ejecución no llegue a Stripe, que un fallo acabe
 * en la cola o, si no se puede grabar, se pueda reanudar, y que la `metadata`
 * de auditoría vaya solo en este camino.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  refunds: { create: vi.fn() },
  paymentIntents: { retrieve: vi.fn() },
}));
const clientMock = vi.hoisted(() => ({ getStripeClient: vi.fn() }));
const retireOfferMock = vi.hoisted(() => vi.fn());
const blockSlotMock = vi.hoisted(() => vi.fn());
const readSlotMock = vi.hoisted(() => vi.fn());
const repoMock = vi.hoisted(() => ({
  findRefundState: vi.fn(),
  recordIssued: vi.fn(),
  recordFailed: vi.fn(),
  clearFailure: vi.fn(),
}));
const incidentRepoMock = vi.hoisted(() => ({
  findRow: vi.fn(),
  cancelForIncident: vi.fn(),
  hasRecordedFailure: vi.fn(),
}));

vi.mock('@/lib/integrations/stripe', () => clientMock);
vi.mock('@/lib/services/slot-offers', () => ({
  retireOfferOfCancelledBooking: retireOfferMock,
}));
vi.mock('@/lib/services/schedule-blocks/schedule-blocks.incident', () => ({
  blockSlotForCentreIncident: blockSlotMock,
  readSlotForCentreIncident: readSlotMock,
}));
vi.mock('./checkout.refund.repository', () => ({ refundRepository: repoMock }));
vi.mock('./checkout.incident-refund.repository', () => ({
  incidentRefundRepository: incidentRepoMock,
}));

import {
  IncidentRefundConflictError,
  IncidentRefundNotEligibleError,
} from './checkout.incident-refund.errors';
import {
  getIncidentRefundPreview,
  refundBookingForCentreIncident,
  resumeCentreIncidentRefund,
} from './checkout.incident-refund.service';
import {
  ADMIN_ID,
  BOOKING_ID,
  FAILED_AT,
  NOTE,
  NOW,
  incidentRow as row,
  paidIntent,
  unfinishedRow,
} from './checkout.incident-refund.test-fixtures';

const INCIDENT_KEY = `booking_refund_incident_${BOOKING_ID}`;

function run(note: string = NOTE) {
  return refundBookingForCentreIncident({ bookingId: BOOKING_ID, note }, ADMIN_ID, { now: NOW });
}

function resume() {
  return resumeCentreIncidentRefund({ bookingId: BOOKING_ID }, ADMIN_ID, { now: NOW });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  clientMock.getStripeClient.mockReturnValue(stripeMock);
  retireOfferMock.mockResolvedValue(undefined);
  blockSlotMock.mockResolvedValue(true);
  readSlotMock.mockResolvedValue('blocked');
  incidentRepoMock.findRow.mockResolvedValue(row());
  incidentRepoMock.cancelForIncident.mockResolvedValue(true);
  incidentRepoMock.hasRecordedFailure.mockResolvedValue(true);
  repoMock.recordFailed.mockResolvedValue(undefined);
  stripeMock.paymentIntents.retrieve.mockResolvedValue(paidIntent());
  stripeMock.refunds.create.mockResolvedValue({ id: 're_1', status: 'succeeded' });
});

describe('getIncidentRefundPreview', () => {
  it('resume la reserva con su elegibilidad, sin tocar nada', async () => {
    const preview = await getIncidentRefundPreview({ bookingId: ` ${BOOKING_ID} ` }, { now: NOW });

    expect(preview).toMatchObject({
      bookingId: BOOKING_ID,
      providerName: 'Estudio Sal',
      serviceName: 'Corte',
      priceCents: 4500,
      status: 'confirmed',
      eligibility: { eligible: true, mode: 'new' },
    });
    expect(incidentRepoMock.cancelForIncident).not.toHaveBeenCalled();
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('una a medias sale elegible para completar', async () => {
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow());

    const preview = await getIncidentRefundPreview({ bookingId: BOOKING_ID }, { now: NOW });

    expect(preview.eligibility).toEqual({ eligible: true, mode: 'resume' });
  });
});

describe('refundBookingForCentreIncident', () => {
  it('cancela una confirmed a menos de 2 h y reembolsa con reversión y auditoría', async () => {
    const result = await run();

    expect(result).toEqual({
      replayed: false,
      bookingId: BOOKING_ID,
      previousStatus: 'confirmed',
      refund: 'issued',
      stripeRefundId: 're_1',
      queued: false,
      slot: 'blocked',
    });
    expect(incidentRepoMock.cancelForIncident).toHaveBeenCalledWith(BOOKING_ID, 'confirmed', {
      at: NOW,
      by: ADMIN_ID,
      note: NOTE,
    });
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_123',
        refund_application_fee: true,
        reverse_transfer: true,
        metadata: { reason: 'centre_incident', note: NOTE, adminUserId: ADMIN_ID },
      },
      { idempotencyKey: INCIDENT_KEY },
    );
    expect(repoMock.recordIssued).toHaveBeenCalledWith(BOOKING_ID, 're_1');
  });

  it('escribe en BD antes de llamar a Stripe', async () => {
    await run();

    const [dbOrder] = incidentRepoMock.cancelForIncident.mock.invocationCallOrder;
    const [stripeOrder] = stripeMock.refunds.create.mock.invocationCallOrder;
    expect(dbOrder).toBeLessThan(stripeOrder ?? 0);
  });

  it('con un parcial o un contracargo no cancela ni reembolsa', async () => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue(paidIntent({ disputed: true }));

    const error = await run().catch((err: unknown) => err);

    expect((error as IncidentRefundNotEligibleError).reason).toBe('disputed');
    expect(incidentRepoMock.cancelForIncident).not.toHaveBeenCalled();
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('con Stripe caído al comprobar no cancela', async () => {
    stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('timeout'));

    const error = await run().catch((err: unknown) => err);

    expect((error as IncidentRefundNotEligibleError).reason).toBe('stripe_unavailable');
    expect(incidentRepoMock.cancelForIncident).not.toHaveBeenCalled();
  });

  it('una completed pasa por cancelled, de donde la cola sabe reintentar', async () => {
    incidentRepoMock.findRow.mockResolvedValue(
      row({ status: 'completed', completedAt: FAILED_AT }),
    );

    const result = await run();

    expect(result).toMatchObject({ previousStatus: 'completed', refund: 'issued' });
    expect(incidentRepoMock.cancelForIncident).toHaveBeenCalledWith(
      BOOKING_ID,
      'completed',
      expect.anything(),
    );
  });

  it('bloquea la franja de una cita por venir, con el admin como autor', async () => {
    await run();

    expect(blockSlotMock).toHaveBeenCalledWith({
      providerId: 'prov-1',
      professionalId: 'pro-1',
      startAt: new Date('2026-11-05T11:00:00.000Z'),
      endAt: new Date('2026-11-05T12:00:00.000Z'),
      createdBy: ADMIN_ID,
      now: NOW,
    });
  });

  it('no bloquea una cita ya empezada o pasada', async () => {
    incidentRepoMock.findRow.mockResolvedValue(row({ startAt: NOW }));

    await expect(run()).resolves.toMatchObject({ refund: 'issued', slot: 'not_applicable' });
    expect(blockSlotMock).not.toHaveBeenCalled();
  });

  it('un fallo al bloquear no frena la devolución y se cuenta', async () => {
    blockSlotMock.mockRejectedValue(new Error('db down'));

    await expect(run()).resolves.toMatchObject({ refund: 'issued', slot: 'not_blocked' });
  });

  it('si otra reserva ocupó la franja, lo distingue de un fallo al bloquear', async () => {
    blockSlotMock.mockResolvedValue(false);

    await expect(run()).resolves.toMatchObject({ refund: 'issued', slot: 'taken' });
  });

  it('retira la oferta de origen para que la hora no se anuncie sola', async () => {
    incidentRepoMock.findRow.mockResolvedValue(row({ slotOfferId: 'offer-1' }));

    await run();

    expect(retireOfferMock).toHaveBeenCalledWith('offer-1', NOW);
  });

  it('un fallo al retirar la oferta no frena la devolución', async () => {
    incidentRepoMock.findRow.mockResolvedValue(row({ slotOfferId: 'offer-1' }));
    retireOfferMock.mockRejectedValueOnce(new Error('db down'));

    await expect(run()).resolves.toMatchObject({ refund: 'issued' });
  });

  it('rechaza el pago en el local sin escribir ni llamar a Stripe', async () => {
    incidentRepoMock.findRow.mockResolvedValue(
      row({ paymentMode: 'onsite', stripePaymentIntentId: null }),
    );

    const error = await run().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(IncidentRefundNotEligibleError);
    expect((error as IncidentRefundNotEligibleError).reason).toBe('onsite');
    expect(incidentRepoMock.cancelForIncident).not.toHaveBeenCalled();
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it.each(['', 'corto', '   nueve    '])(
    'rechaza el motivo corto %j antes de leer',
    async (note) => {
      await expect(run(note)).rejects.toThrow();
      expect(incidentRepoMock.findRow).not.toHaveBeenCalled();
    },
  );

  it('rechaza un motivo de más de 500 caracteres, el límite de Stripe', async () => {
    await expect(run('x'.repeat(501))).rejects.toThrow();
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('el segundo intento tras el éxito no llama a Stripe y no se presenta como nuevo', async () => {
    await run();
    incidentRepoMock.findRow.mockResolvedValue(
      unfinishedRow({ stripeRefundId: 're_1', incidentRefundAt: NOW }),
    );

    const second = await run();

    expect(second).toEqual({
      replayed: true,
      bookingId: BOOKING_ID,
      refund: 'already_refunded',
      stripeRefundId: 're_1',
      notice: { previousStatus: 'confirmed', slot: 'blocked' },
    });
    expect(stripeMock.refunds.create).toHaveBeenCalledTimes(1);
    expect(incidentRepoMock.cancelForIncident).toHaveBeenCalledTimes(1);
  });

  it('con la primera en vuelo, la segunda responde en curso y no llega a Stripe', async () => {
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow({ incidentRefundAt: NOW }));

    const error = await run().catch((err: unknown) => err);

    expect((error as IncidentRefundNotEligibleError).reason).toBe('in_progress');
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('quien pierde la carrera de la escritura no llega a Stripe', async () => {
    incidentRepoMock.cancelForIncident.mockResolvedValue(false);

    await expect(run()).rejects.toBeInstanceOf(IncidentRefundConflictError);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    expect(blockSlotMock).not.toHaveBeenCalled();
  });

  it('no reescribe el motivo de una reserva a medias: eso es completarla', async () => {
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow());

    await expect(run()).rejects.toBeInstanceOf(IncidentRefundConflictError);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('con Stripe fallando la reserva queda cancelada y en la cola', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('Insufficient funds'), { code: 'balance_insufficient' }),
    );

    const result = await run();

    expect(result).toMatchObject({
      replayed: false,
      refund: 'failed',
      stripeRefundId: null,
      queued: true,
    });
    expect(repoMock.recordFailed).toHaveBeenCalledWith(
      BOOKING_ID,
      NOW,
      'balance_insufficient: Insufficient funds',
    );
  });

  it('si el fallo no se puede grabar no consta en la cola, y se puede reanudar', async () => {
    stripeMock.refunds.create.mockRejectedValue(new Error('boom'));
    repoMock.recordFailed.mockRejectedValue(new Error('db down'));
    incidentRepoMock.hasRecordedFailure.mockResolvedValue(false);

    await expect(run()).resolves.toMatchObject({ refund: 'failed', queued: false });

    stripeMock.refunds.create.mockResolvedValue({ id: 're_2', status: 'succeeded' });
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow());
    await expect(resume()).resolves.toMatchObject({ refund: 'issued', stripeRefundId: 're_2' });
  });

  it('si ni la relectura funciona, no afirma que esté en la cola', async () => {
    stripeMock.refunds.create.mockRejectedValue(new Error('boom'));
    incidentRepoMock.hasRecordedFailure.mockRejectedValue(new Error('db down'));

    await expect(run()).resolves.toMatchObject({ refund: 'failed', queued: false });
  });

  it('un refund devuelto como failed también va a la cola', async () => {
    stripeMock.refunds.create.mockResolvedValue({
      id: 're_2',
      status: 'failed',
      failure_reason: 'expired_or_canceled_card',
    });

    await expect(run()).resolves.toMatchObject({ refund: 'failed' });
    expect(repoMock.recordFailed).toHaveBeenCalled();
    expect(repoMock.recordIssued).not.toHaveBeenCalled();
  });

  it('si el cliente de Stripe deja de crearse tras comprobar, va a la cola', async () => {
    clientMock.getStripeClient.mockReturnValueOnce(stripeMock).mockImplementation(() => {
      throw new Error('STRIPE_SECRET_KEY missing');
    });

    await expect(run()).resolves.toMatchObject({ refund: 'failed' });
    expect(repoMock.recordFailed).toHaveBeenCalledTimes(1);
  });

  it('un cargo ya devuelto cuenta como already_refunded y es una ejecución real', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('Already refunded'), { code: 'charge_already_refunded' }),
    );

    await expect(run()).resolves.toMatchObject({ replayed: false, refund: 'already_refunded' });
    expect(repoMock.clearFailure).toHaveBeenCalledWith(BOOKING_ID);
  });

  it('nunca escribe el motivo en los logs', async () => {
    stripeMock.refunds.create.mockRejectedValue(new Error('boom'));

    await run();

    const logged = JSON.stringify([
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ]);
    expect(logged).not.toContain(NOTE);
  });
});
