/**
 * Tests de completar un reembolso por incidencia a medias, y de que la
 * `metadata` de auditoría vaya solo en sus caminos: los automáticos no cambian.
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
const sentryEnabledMock = vi.hoisted(() => vi.fn(() => false));
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
vi.mock('@/lib/integrations/sentry', () => ({ isSentryEnabled: sentryEnabledMock }));
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
import { resumeCentreIncidentRefund } from './checkout.incident-refund.service';
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
import { retryBookingRefund } from './checkout.refund-queue.service';
import { issueBookingRefund } from './checkout.refund.issue';

const INCIDENT_KEY = `booking_refund_incident_${BOOKING_ID}`;

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

describe('resumeCentreIncidentRefund', () => {
  beforeEach(() => {
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow());
  });

  it('usa la misma clave y reconstruye la metadata desde las columnas', async () => {
    const result = await resume();

    expect(result).toMatchObject({
      replayed: false,
      refund: 'issued',
      previousStatus: 'confirmed',
    });
    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_123',
        refund_application_fee: true,
        reverse_transfer: true,
        metadata: { reason: 'centre_incident', note: NOTE, adminUserId: 'admin-original' },
      },
      { idempotencyKey: INCIDENT_KEY },
    );
    expect(incidentRepoMock.cancelForIncident).not.toHaveBeenCalled();
  });

  it('recupera que venía de completed por su completedAt', async () => {
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow({ completedAt: FAILED_AT }));

    await expect(resume()).resolves.toMatchObject({ previousStatus: 'completed' });
  });

  it('repite el bloqueo, porque la caída pudo ser anterior', async () => {
    await expect(resume()).resolves.toMatchObject({ slot: 'blocked' });
    expect(blockSlotMock).toHaveBeenCalledTimes(1);
  });

  it('no reanuda dentro del margen', async () => {
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow({ incidentRefundAt: NOW }));

    const error = await resume().catch((err: unknown) => err);

    expect((error as IncidentRefundNotEligibleError).reason).toBe('in_progress');
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('una reserva viva no se reanuda: no hay motivo que reutilizar', async () => {
    incidentRepoMock.findRow.mockResolvedValue(row());

    await expect(resume()).rejects.toBeInstanceOf(IncidentRefundConflictError);
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
  });

  it('si ya consta devuelta, no llama a Stripe pero deja repetir los avisos', async () => {
    incidentRepoMock.findRow.mockResolvedValue(unfinishedRow({ stripeRefundId: 're_1' }));

    await expect(resume()).resolves.toEqual({
      replayed: true,
      bookingId: BOOKING_ID,
      refund: 'already_refunded',
      stripeRefundId: 're_1',
      notice: { previousStatus: 'confirmed', slot: 'blocked' },
    });
    expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    // Repetir un aviso no vuelve a bloquear: el centro pudo quitarlo a propósito.
    expect(blockSlotMock).not.toHaveBeenCalled();
  });

  it('dos reanudaciones a la vez: la segunda responde en curso, sin cola ni Sentry', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('Key in use'), { code: 'idempotency_key_in_use' }),
    );

    const error = await resume().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(IncidentRefundNotEligibleError);
    expect((error as IncidentRefundNotEligibleError).reason).toBe('in_progress');
    expect(repoMock.recordFailed).not.toHaveBeenCalled();
    expect(repoMock.recordIssued).not.toHaveBeenCalled();
    expect(sentryEnabledMock).not.toHaveBeenCalled();
  });
});

describe('metadata solo en estos caminos', () => {
  function queuedState(overrides: Record<string, unknown> = {}) {
    return {
      id: BOOKING_ID,
      status: 'cancelled',
      stripePaymentIntentId: 'pi_123',
      refundFailedAt: FAILED_AT,
      refundedAt: null,
      refundDismissedAt: null,
      incidentRefundAt: null,
      incidentRefundBy: null,
      incidentRefundNote: null,
      ...overrides,
    };
  }

  it('los caminos automáticos no la mandan y conservan su clave', async () => {
    await issueBookingRefund(BOOKING_ID, 'pi_123');

    expect(stripeMock.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_123', refund_application_fee: true, reverse_transfer: true },
      { idempotencyKey: `booking_refund_${BOOKING_ID}` },
    );
  });

  it('sin la opción, los caminos automáticos tratan la clave en uso como un fallo', async () => {
    stripeMock.refunds.create.mockRejectedValue(
      Object.assign(new Error('Key in use'), { code: 'idempotency_key_in_use' }),
    );

    await expect(issueBookingRefund(BOOKING_ID, 'pi_123')).resolves.toEqual({
      outcome: 'failed',
      stripeRefundId: null,
    });
    expect(repoMock.recordFailed).toHaveBeenCalledTimes(1);
    expect(sentryEnabledMock).toHaveBeenCalled();
  });

  it('el reintento de la cola no la manda en una reserva normal', async () => {
    repoMock.findRefundState.mockResolvedValue(queuedState());

    await retryBookingRefund({ bookingId: BOOKING_ID });

    const [params] = stripeMock.refunds.create.mock.calls[0] ?? [];
    expect(params).not.toHaveProperty('metadata');
  });

  it('el reintento de la cola sí la manda en una reserva de incidencia', async () => {
    repoMock.findRefundState.mockResolvedValue(
      queuedState({
        incidentRefundAt: FAILED_AT,
        incidentRefundBy: 'admin-original',
        incidentRefundNote: NOTE,
      }),
    );

    await retryBookingRefund({ bookingId: BOOKING_ID });

    const [params, options] = stripeMock.refunds.create.mock.calls[0] ?? [];
    expect(params.metadata).toEqual({
      reason: 'centre_incident',
      note: NOTE,
      adminUserId: 'admin-original',
    });
    expect(options.idempotencyKey).toContain('_retry_');
  });
});
