/**
 * Tests de las transiciones disparadas por webhooks de Stripe.
 *
 * El foco está en las dos propiedades que hacen seguro un webhook:
 * **idempotencia** (Stripe reentrega eventos) y **no resurrección** (un
 * evento tardío no revive una reserva ya cancelada o reembolsada).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const bookingMock = vi.hoisted(() => ({
  bookingRepository: { findById: vi.fn(), updateStatus: vi.fn() },
}));

vi.mock('@/lib/services/booking', () => ({
  bookingRepository: bookingMock.bookingRepository,
}));

const repoMock = vi.hoisted(() => ({ findByPaymentIntentId: vi.fn() }));

vi.mock('./checkout.repository', () => ({ checkoutRepository: repoMock }));

import { BookingForCheckoutNotFoundError, MissingBookingReferenceError } from './checkout.errors';
import {
  confirmBookingPayment,
  failBookingPayment,
  refundBookingPayment,
} from './checkout.webhook.service';

/** PaymentIntent mínimo con la metadata que escribe el checkout. */
function intent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_123',
    metadata: { bookingId: 'bk-1' },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function bookingRow(status: string, stripePaymentIntentId: string | null = 'pi_123') {
  return { id: 'bk-1', status, stripePaymentIntentId };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('confirmBookingPayment', () => {
  it('pasa la reserva de pending a confirmed', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending'));

    const result = await confirmBookingPayment(intent());

    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalledWith('bk-1', 'confirmed');
    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'confirmed' });
  });

  it('es idempotente si la reserva ya estaba confirmada', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    const result = await confirmBookingPayment(intent());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });

  it('no resucita una reserva cancelada aunque llegue un succeeded tardío', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('cancelled'));

    const result = await confirmBookingPayment(intent());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'cancelled' });
  });

  it('rechaza el evento si el intent no coincide con el anclado en la reserva', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending', 'pi_otro'));

    await expect(confirmBookingPayment(intent())).rejects.toBeInstanceOf(
      BookingForCheckoutNotFoundError,
    );
  });

  it('lanza BookingForCheckoutNotFoundError si el bookingId no existe', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(null);

    await expect(confirmBookingPayment(intent())).rejects.toBeInstanceOf(
      BookingForCheckoutNotFoundError,
    );
  });

  it('cae a buscar por PaymentIntent cuando falta la metadata', async () => {
    repoMock.findByPaymentIntentId.mockResolvedValue(bookingRow('pending'));

    const result = await confirmBookingPayment(intent({ metadata: {} }));

    expect(repoMock.findByPaymentIntentId).toHaveBeenCalledWith('pi_123');
    expect(result.changed).toBe(true);
  });

  it('lanza MissingBookingReferenceError si no hay metadata ni id de intent', async () => {
    await expect(
      confirmBookingPayment(intent({ metadata: {}, id: undefined })),
    ).rejects.toBeInstanceOf(MissingBookingReferenceError);
  });
});

describe('failBookingPayment', () => {
  it('cancela la reserva pendiente para liberar el hueco', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending'));

    const result = await failBookingPayment(intent());

    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalledWith(
      'bk-1',
      'cancelled',
      expect.objectContaining({ cancelledAt: expect.any(Date) }),
    );
    expect(result.status).toBe('cancelled');
  });

  it('no toca una reserva ya confirmada', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    const result = await failBookingPayment(intent());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });
});

describe('refundBookingPayment', () => {
  /** Charge mínimo tal y como lo entrega Stripe (metadata heredada del PI). */
  function charge(overrides: Record<string, unknown> = {}) {
    return {
      id: 'ch_1',
      payment_intent: 'pi_123',
      metadata: { bookingId: 'bk-1' },
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it('marca como refunded una reserva confirmada', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    const result = await refundBookingPayment(charge());

    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalledWith(
      'bk-1',
      'refunded',
      expect.objectContaining({ cancelledAt: expect.any(Date) }),
    );
    expect(result.status).toBe('refunded');
  });

  it('también cubre reservas ya completadas (reembolso posterior al servicio)', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('completed'));

    const result = await refundBookingPayment(charge());

    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'refunded' });
  });

  it('marca como refunded una reserva ya cancelada por el proveedor', async () => {
    // Es el caso normal de nuestro propio refund: cancelamos en BD
    // primero y emitimos el reembolso después, así que el evento llega
    // siempre sobre una reserva `cancelled`.
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('cancelled'));

    const result = await refundBookingPayment(charge());

    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalledWith(
      'bk-1',
      'refunded',
      expect.objectContaining({ cancelledAt: expect.any(Date) }),
    );
    expect(result).toEqual({ bookingId: 'bk-1', changed: true, status: 'refunded' });
  });

  it('sigue ignorando un refund sobre una reserva pending', async () => {
    // `pending` nunca llegó a cobrarse: un refund ahí es un evento
    // ajeno o un descuadre, no una transición nuestra.
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('pending'));

    const result = await refundBookingPayment(charge());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result).toEqual({ bookingId: 'bk-1', changed: false, status: 'pending' });
  });

  it('es idempotente ante un segundo charge.refunded', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('refunded'));

    const result = await refundBookingPayment(charge());

    expect(bookingMock.bookingRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.changed).toBe(false);
  });

  it('acepta payment_intent expandido como objeto', async () => {
    bookingMock.bookingRepository.findById.mockResolvedValue(bookingRow('confirmed'));

    await refundBookingPayment(charge({ payment_intent: { id: 'pi_123' } }));

    expect(bookingMock.bookingRepository.updateStatus).toHaveBeenCalled();
  });
});
