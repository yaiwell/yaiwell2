/**
 * Tests del pago que llega tarde (`succeeded` sobre una reserva que ya
 * no lo espera), llamando directamente al service.
 *
 * Caminos protegidos:
 *  - Retención vencida y franja libre → se confirma (condicional) bajo
 *    el bloqueo por profesional: lock → solape → confirmación, todo en
 *    la misma transacción, para no competir con `createBooking`.
 *  - Retención vencida y franja ocupada → se cancela y se reembolsa.
 *  - Franja ya empezada → se cancela y se reembolsa aunque esté libre.
 *  - Pagó dentro de la retención pero el webhook llegó tarde y la franja
 *    ya es de otro → reembolso + aviso `error` a Sentry.
 *  - La confirmación condicional pierde la carrera → se sigue el estado
 *    real sin resucitar nada.
 *  - Fallo de Stripe → la reserva entra en la cola de /admin.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as BookingHold from '@/lib/services/booking/booking.hold';

const bookingMock = vi.hoisted(() => ({
  bookingRepository: { findOverlapping: vi.fn(), lockProfessional: vi.fn() },
}));

// Cliente de transacción falso: `$transaction` ejecuta el callback con él,
// así comprobamos que lectura y escritura usan el mismo `tx`.
const txMock = vi.hoisted(() => ({ marker: 'tx' }));
const prismaMock = vi.hoisted(() => ({ $transaction: vi.fn() }));

vi.mock('@/lib/db/prisma', () => ({ prisma: prismaMock }));

vi.mock('@/lib/services/booking', async () => {
  const hold = await vi.importActual<typeof BookingHold>('@/lib/services/booking/booking.hold');
  return {
    bookingRepository: bookingMock.bookingRepository,
    isBookingHoldingSlot: hold.isBookingHoldingSlot,
  };
});

const repoMock = vi.hoisted(() => ({
  confirmIfPending: vi.fn(),
  cancelIfPending: vi.fn(),
  findCheckoutRow: vi.fn(),
  attachPaymentIntent: vi.fn(),
}));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

const issueMock = vi.hoisted(() => ({ issueBookingRefund: vi.fn() }));

vi.mock('./checkout.refund.issue', () => issueMock);

const warnMock = vi.hoisted(() => ({ reportCheckoutWarning: vi.fn() }));

vi.mock('./checkout.payment-intent', () => warnMock);

import { settlePaymentOnPendingBooking } from './checkout.late-payment.service';

const NOW = new Date('2026-10-26T10:00:00.000Z');
const MINUTE = 60 * 1000;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-1',
    status: 'pending',
    stripePaymentIntentId: 'pi_123',
    professionalId: 'pro-1',
    startAt: new Date('2026-10-27T10:00:00.000Z'),
    endAt: new Date('2026-10-27T11:00:00.000Z'),
    stripeRefundId: null,
    refundFailedAt: null,
    refundFailureReason: null,
    // Retención vencida por defecto: creada hace 45 min.
    createdAt: new Date(NOW.getTime() - 45 * MINUTE),
    ...overrides,
  };
}

const LATE_CLOCK = { paidAt: NOW, now: NOW };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  prismaMock.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(txMock));
  bookingMock.bookingRepository.findOverlapping.mockResolvedValue([]);
  repoMock.confirmIfPending.mockResolvedValue(true);
  repoMock.cancelIfPending.mockResolvedValue(true);
  issueMock.issueBookingRefund.mockResolvedValue({ outcome: 'issued', stripeRefundId: 're_1' });
});

describe('settlePaymentOnPendingBooking', () => {
  it('confirma con la retención vencida si la franja sigue libre', async () => {
    // La única fila solapada es ella misma: no cuenta como ocupación.
    bookingMock.bookingRepository.findOverlapping.mockResolvedValue([{ id: 'bk-1' }]);

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(repoMock.confirmIfPending).toHaveBeenCalledWith('bk-1', txMock);
    expect(issueMock.issueBookingRefund).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'confirmed' });
  });

  it('con la retención vencida, bloquea → mira el solape → confirma en la misma transacción', async () => {
    await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    const { lockProfessional, findOverlapping } = bookingMock.bookingRepository;
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(lockProfessional).toHaveBeenCalledWith(txMock, 'pro-1');
    expect(findOverlapping).toHaveBeenCalledWith('pro-1', row().startAt, row().endAt, NOW, txMock);
    const lockAt = lockProfessional.mock.invocationCallOrder[0];
    const overlapAt = findOverlapping.mock.invocationCallOrder[0];
    const confirmAt = repoMock.confirmIfPending.mock.invocationCallOrder[0];
    expect(lockAt).toBeLessThan(overlapAt);
    expect(overlapAt).toBeLessThan(confirmAt);
  });

  it('si otra reserva ocupa la franja bajo el bloqueo, reembolsa fuera de la transacción', async () => {
    // Simula a B creada por `createBooking` antes de que tomáramos el lock.
    bookingMock.bookingRepository.findOverlapping.mockResolvedValue([{ id: 'bk-b' }]);
    let insideTransaction = false;
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      insideTransaction = true;
      try {
        return await fn(txMock);
      } finally {
        insideTransaction = false;
      }
    });
    let refundedInside: boolean | undefined;
    issueMock.issueBookingRefund.mockImplementation(async () => {
      refundedInside = insideTransaction;
      return { outcome: 'issued', stripeRefundId: 're_1' };
    });

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(repoMock.confirmIfPending).not.toHaveBeenCalled();
    expect(repoMock.cancelIfPending).toHaveBeenCalledWith('bk-1', NOW);
    expect(refundedInside).toBe(false);
    expect(result).toEqual({
      bookingId: 'bk-1',
      changed: true,
      status: 'cancelled',
      lateRefund: 'issued',
    });
  });

  it('con la retención vencida, si la confirmación bajo bloqueo no aplica sigue el estado real', async () => {
    repoMock.confirmIfPending.mockResolvedValue(false);
    repoMock.findCheckoutRow.mockResolvedValue(row({ status: 'cancelled' }));

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(repoMock.confirmIfPending).toHaveBeenCalledWith('bk-1', txMock);
    expect(repoMock.cancelIfPending).not.toHaveBeenCalled();
    expect(issueMock.issueBookingRefund).toHaveBeenCalledWith('bk-1', 'pi_123');
    expect(result).toEqual({
      bookingId: 'bk-1',
      changed: false,
      status: 'cancelled',
      lateRefund: 'issued',
    });
  });

  it('cancela y reembolsa si otra reserva cogió la franja', async () => {
    bookingMock.bookingRepository.findOverlapping.mockResolvedValue([{ id: 'bk-otra' }]);

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(repoMock.confirmIfPending).not.toHaveBeenCalled();
    expect(repoMock.cancelIfPending).toHaveBeenCalledWith('bk-1', NOW);
    expect(issueMock.issueBookingRefund).toHaveBeenCalledWith('bk-1', 'pi_123', { now: NOW });
    // Pagó tarde de verdad: no es incidencia para soporte.
    expect(warnMock.reportCheckoutWarning).not.toHaveBeenCalled();
    expect(result).toEqual({
      bookingId: 'bk-1',
      changed: true,
      status: 'cancelled',
      lateRefund: 'issued',
    });
  });

  it('cancela y reembolsa si la franja ya empezó, aunque esté libre', async () => {
    const started = row({ startAt: new Date(NOW.getTime() - 10 * MINUTE) });

    const result = await settlePaymentOnPendingBooking(started, 'pi_123', LATE_CLOCK);

    expect(repoMock.confirmIfPending).not.toHaveBeenCalled();
    expect(issueMock.issueBookingRefund).toHaveBeenCalled();
    expect(result.status).toBe('cancelled');
  });

  it('avisa a Sentry si pagó dentro de la retención pero el webhook llegó tarde', async () => {
    // Pagó a los 10 min de crear; procesamos a los 45 min y la franja
    // ya es de otro.
    const clock = { paidAt: new Date(NOW.getTime() - 35 * MINUTE), now: NOW };
    bookingMock.bookingRepository.findOverlapping.mockResolvedValue([{ id: 'bk-otra' }]);

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', clock);

    expect(issueMock.issueBookingRefund).toHaveBeenCalled();
    expect(warnMock.reportCheckoutWarning).toHaveBeenCalledWith(
      expect.any(String),
      'bk-1',
      'error',
    );
    expect(result.status).toBe('cancelled');
  });

  it('confirma sin mirar la franja si la retención sigue vigente', async () => {
    const fresh = row({ createdAt: new Date(NOW.getTime() - 5 * MINUTE) });

    await settlePaymentOnPendingBooking(fresh, 'pi_123', LATE_CLOCK);

    expect(bookingMock.bookingRepository.findOverlapping).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(repoMock.confirmIfPending).toHaveBeenCalledWith('bk-1');
  });

  it('si el proveedor canceló entre medias, no resucita y reembolsa', async () => {
    repoMock.confirmIfPending.mockResolvedValue(false);
    repoMock.findCheckoutRow.mockResolvedValue(row({ status: 'cancelled' }));

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(issueMock.issueBookingRefund).toHaveBeenCalledWith('bk-1', 'pi_123');
    expect(result).toEqual({
      bookingId: 'bk-1',
      changed: false,
      status: 'cancelled',
      lateRefund: 'issued',
    });
  });

  it('una reentrega con el reembolso ya hecho no vuelve a pedir aviso', async () => {
    repoMock.confirmIfPending.mockResolvedValue(false);
    repoMock.findCheckoutRow.mockResolvedValue(row({ status: 'cancelled' }));
    issueMock.issueBookingRefund.mockResolvedValue({
      outcome: 'already_refunded',
      stripeRefundId: null,
    });

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(result).not.toHaveProperty('lateRefund');
  });

  it('si otra entrega ya la confirmó, no hace nada', async () => {
    repoMock.confirmIfPending.mockResolvedValue(false);
    repoMock.findCheckoutRow.mockResolvedValue(row({ status: 'confirmed' }));

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(issueMock.issueBookingRefund).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'confirmed' });
  });

  it('ancla el intent antes de reembolsar si el checkout no llegó a guardarlo', async () => {
    bookingMock.bookingRepository.findOverlapping.mockResolvedValue([{ id: 'bk-otra' }]);

    await settlePaymentOnPendingBooking(row({ stripePaymentIntentId: null }), 'pi_123', LATE_CLOCK);

    expect(repoMock.attachPaymentIntent).toHaveBeenCalledWith('bk-1', 'pi_123');
  });

  it('si la BD rechaza la confirmación por solape, reembolsa como franja ocupada', async () => {
    repoMock.confirmIfPending.mockRejectedValue(
      Object.assign(new Error('violates exclusion constraint'), { code: '23P01' }),
    );

    const result = await settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK);

    expect(repoMock.cancelIfPending).toHaveBeenCalledWith('bk-1', NOW);
    expect(issueMock.issueBookingRefund).toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'cancelled', lateRefund: 'issued' });
  });

  it('con la retención vigente, una violación de solape también reembolsa', async () => {
    const fresh = row({ createdAt: new Date(NOW.getTime() - 5 * MINUTE) });
    repoMock.confirmIfPending.mockRejectedValue({ meta: { code: '23P01' } });

    const result = await settlePaymentOnPendingBooking(fresh, 'pi_123', LATE_CLOCK);

    expect(issueMock.issueBookingRefund).toHaveBeenCalled();
    expect(result.status).toBe('cancelled');
  });

  it('otros errores de BD se propagan para que Stripe reintente', async () => {
    repoMock.confirmIfPending.mockRejectedValue(new Error('db down'));

    await expect(settlePaymentOnPendingBooking(row(), 'pi_123', LATE_CLOCK)).rejects.toThrow(
      'db down',
    );
  });
});
