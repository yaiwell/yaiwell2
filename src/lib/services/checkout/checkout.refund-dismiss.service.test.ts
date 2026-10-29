/**
 * Tests del descarte manual de entradas de la cola de reembolsos.
 *
 * Se protege que solo se descarte lo que de verdad está en la cola y
 * sobre una reserva cancelada, que el motivo sea obligatorio, que la
 * escritura sea condicional (una carrera con `charge.refunded` no queda
 * tapada) y que la cola deje de listar las entradas descartadas.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

const prismaMock = vi.hoisted(() => ({
  booking: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
}));

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

const stripeMock = vi.hoisted(() => ({ paymentIntents: { retrieve: vi.fn() } }));

vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

import {
  BookingForCheckoutNotFoundError,
  RefundNotDismissableError,
  RefundNotInQueueError,
} from './checkout.errors';
import { dismissBookingRefund } from './checkout.refund-dismiss.service';
import { refundRepository } from './checkout.refund.repository';

const BOOKING_ID = '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c';
const ADMIN_ID = 'admin-user-1';
const NOW = new Date('2026-10-29T09:00:00.000Z');
const REASON = 'pi_cancel_failed sin cobro: el intent nunca se confirmó';

function queuedState(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    status: 'cancelled',
    stripePaymentIntentId: 'pi_123',
    refundFailedAt: new Date('2026-10-25T12:00:00.000Z'),
    refundedAt: null,
    refundDismissedAt: null,
    ...overrides,
  };
}

function dismiss(reason = REASON) {
  return dismissBookingRefund({ bookingId: BOOKING_ID, reason }, ADMIN_ID, { now: NOW });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  prismaMock.booking.findUnique.mockResolvedValue(queuedState());
  prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });
  // Caso típico de la cola: `pi_cancel_failed` sobre un intent que nunca cobró.
  stripeMock.paymentIntents.retrieve.mockResolvedValue({
    status: 'requires_payment_method',
    latest_charge: null,
  });
});

/** Intent cobrado con su cargo expandido. */
function paid(chargeOverrides: Record<string, unknown> = {}) {
  return {
    status: 'succeeded',
    latest_charge: {
      id: 'ch_1',
      amount: 4500,
      amount_refunded: 0,
      refunded: false,
      ...chargeOverrides,
    },
  };
}

describe('dismissBookingRefund', () => {
  it('descarta con auditoría y escritura condicional a seguir en la cola', async () => {
    const result = await dismiss(`  ${REASON}  `);

    expect(result).toEqual({ bookingId: BOOKING_ID, dismissedAt: NOW });
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith({
      where: {
        id: BOOKING_ID,
        status: 'cancelled',
        refundFailedAt: { not: null },
        refundedAt: null,
        refundDismissedAt: null,
      },
      // El motivo llega recortado.
      data: { refundDismissedAt: NOW, refundDismissedBy: ADMIN_ID, refundDismissReason: REASON },
    });
  });

  it('exige un motivo de al menos 5 caracteres (sin contar espacios)', async () => {
    await expect(dismiss('  ok  ')).rejects.toBeInstanceOf(ZodError);
    expect(prismaMock.booking.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza un id que no es UUID', async () => {
    await expect(
      dismissBookingRefund({ bookingId: 'x', reason: REASON }, ADMIN_ID),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('lanza BookingForCheckoutNotFoundError si la reserva no existe', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);
    await expect(dismiss()).rejects.toBeInstanceOf(BookingForCheckoutNotFoundError);
  });

  it.each([
    ['nunca falló', { refundFailedAt: null }],
    ['ya devuelta', { refundedAt: new Date() }],
    ['ya descartada', { refundDismissedAt: new Date() }],
  ])('lanza RefundNotInQueueError si %s', async (_label, overrides) => {
    prismaMock.booking.findUnique.mockResolvedValue(queuedState(overrides));

    await expect(dismiss()).rejects.toBeInstanceOf(RefundNotInQueueError);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it('no descarta el reembolso de una reserva viva', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(queuedState({ status: 'confirmed' }));

    await expect(dismiss()).rejects.toBeInstanceOf(RefundNotDismissableError);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it('consulta Stripe antes de descartar', async () => {
    await dismiss();

    expect(stripeMock.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123', {
      expand: ['latest_charge'],
    });
  });

  it.each([
    ['cobrado sin reembolso', paid()],
    ['cobrado con reembolso parcial', paid({ amount_refunded: 1000 })],
    ['cobrado sin cargo legible', { status: 'succeeded', latest_charge: null }],
    ['retenido sin capturar', { status: 'requires_capture', latest_charge: null }],
    ['con el pago en curso', { status: 'processing', latest_charge: null }],
  ])('no descarta dinero %s', async (_label, intent) => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue(intent);

    await expect(dismiss()).rejects.toBeInstanceOf(RefundNotDismissableError);
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['reembolsado entero', paid({ amount_refunded: 4500, refunded: true })],
    ['cancelado sin cobro', { status: 'canceled', latest_charge: null }],
  ])('descarta un intent %s', async (_label, intent) => {
    stripeMock.paymentIntents.retrieve.mockResolvedValue(intent);

    await expect(dismiss()).resolves.toEqual({ bookingId: BOOKING_ID, dismissedAt: NOW });
  });

  it('sin PaymentIntent no consulta Stripe', async () => {
    prismaMock.booking.findUnique.mockResolvedValue(queuedState({ stripePaymentIntentId: null }));

    await dismiss();

    expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
    expect(prismaMock.booking.updateMany).toHaveBeenCalled();
  });

  it('si Stripe falla no descarta (ante la duda hay dinero)', async () => {
    stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('ECONNRESET'));

    await expect(dismiss()).rejects.toThrow('ECONNRESET');
    expect(prismaMock.booking.updateMany).not.toHaveBeenCalled();
  });

  it('lanza RefundNotInQueueError si la fila salió de la cola en paralelo', async () => {
    prismaMock.booking.updateMany.mockResolvedValue({ count: 0 });
    await expect(dismiss()).rejects.toBeInstanceOf(RefundNotInQueueError);
  });
});

describe('refundRepository y la cola', () => {
  it('la cola excluye las entradas descartadas', async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    await refundRepository.findPending();

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { refundFailedAt: { not: null }, refundedAt: null, refundDismissedAt: null },
      }),
    );
  });

  it('un fallo nuevo reabre una entrada descartada', async () => {
    const failedAt = new Date('2026-10-30T10:00:00.000Z');

    await refundRepository.recordFailed(BOOKING_ID, failedAt, 'refund_failed: x');

    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: {
        refundFailedAt: failedAt,
        refundFailureReason: 'refund_failed: x',
        refundDismissedAt: null,
      },
    });
  });
});
