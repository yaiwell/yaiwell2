/**
 * Tests de la server action de reintento de reembolsos (/admin/reembolsos).
 *
 * Mockeamos el guard de rol y el dominio `checkout`: lo que se protege
 * es que un no admin nunca llegue a Stripe y que los errores tipados se
 * traduzcan a códigos estables sin filtrar mensajes del servidor.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { requireRoleMock, retryBookingRefundMock, revalidatePathMock, errors, notifyMock } =
  vi.hoisted(() => {
    class BookingForCheckoutNotFoundError extends Error {}
    class RefundNotInQueueError extends Error {}
    return {
      requireRoleMock: vi.fn(),
      retryBookingRefundMock: vi.fn(),
      revalidatePathMock: vi.fn(),
      errors: { BookingForCheckoutNotFoundError, RefundNotInQueueError },
      notifyMock: vi.fn(async () => {}),
    };
  });

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/auth/server', () => ({ requireRole: requireRoleMock }));
vi.mock('@/lib/services/checkout', () => ({
  retryBookingRefund: retryBookingRefundMock,
  BookingForCheckoutNotFoundError: errors.BookingForCheckoutNotFoundError,
  RefundNotInQueueError: errors.RefundNotInQueueError,
}));

vi.mock('@/lib/services/notifications', () => ({
  scheduleNotification: (task: () => Promise<void>) => void task(),
  notifyRefundCompleted: notifyMock,
}));

import { retryRefundAction } from './actions';

const BOOKING_ID = '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f';

describe('retryRefundAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 'clerk_admin', role: 'admin' });
  });

  it('rechaza a un no admin sin tocar Stripe', async () => {
    // `requireRole` redirige (lanza) cuando el rol no está permitido.
    requireRoleMock.mockRejectedValue(new Error('NEXT_REDIRECT'));

    const result = await retryRefundAction('es', BOOKING_ID);

    expect(result).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(requireRoleMock).toHaveBeenCalledWith(['admin'], 'es');
    expect(retryBookingRefundMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rechaza un locale no soportado sin llamar a nada', async () => {
    // Simula un POST directo a la action con un locale manipulado.
    const result = await retryRefundAction('xx' as never, BOOKING_ID);

    expect(result).toEqual({ ok: false, code: 'VALIDATION' });
    expect(requireRoleMock).not.toHaveBeenCalled();
    expect(retryBookingRefundMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it.each(['succeeded', 'failed', 'not_applicable'] as const)(
    'devuelve el desenlace %s y revalida la página',
    async (outcome) => {
      retryBookingRefundMock.mockResolvedValue({
        bookingId: BOOKING_ID,
        refund: outcome,
        stripeRefundId: null,
      });

      const result = await retryRefundAction('ca', BOOKING_ID);

      expect(result).toEqual({ ok: true, outcome });
      expect(retryBookingRefundMock).toHaveBeenCalledWith({ bookingId: BOOKING_ID });
      expect(revalidatePathMock).toHaveBeenCalledWith('/ca/admin/reembolsos');
      // Solo un reembolso emitido de verdad cierra el aviso «en trámite».
      if (outcome === 'succeeded') expect(notifyMock).toHaveBeenCalledWith(BOOKING_ID);
      else expect(notifyMock).not.toHaveBeenCalled();
    },
  );

  it('mapea la reserva inexistente a BOOKING_NOT_FOUND', async () => {
    retryBookingRefundMock.mockRejectedValue(new errors.BookingForCheckoutNotFoundError('x'));

    expect(await retryRefundAction('es', BOOKING_ID)).toEqual({
      ok: false,
      code: 'BOOKING_NOT_FOUND',
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('mapea un reembolso fuera de la cola a NOT_IN_QUEUE', async () => {
    retryBookingRefundMock.mockRejectedValue(new errors.RefundNotInQueueError('x'));

    expect(await retryRefundAction('es', BOOKING_ID)).toEqual({
      ok: false,
      code: 'NOT_IN_QUEUE',
    });
  });

  it('mapea un id inválido (ZodError) a VALIDATION', async () => {
    const zodError = z.object({ bookingId: z.string().uuid() }).safeParse({ bookingId: 'x' }).error;
    retryBookingRefundMock.mockRejectedValue(zodError);

    expect(await retryRefundAction('es', 'x')).toEqual({ ok: false, code: 'VALIDATION' });
  });

  it('no filtra el mensaje de un error inesperado', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    retryBookingRefundMock.mockRejectedValue(new Error('secreto interno de la BD'));

    const result = await retryRefundAction('es', BOOKING_ID);

    expect(result).toEqual({ ok: false, code: 'INTERNAL' });
    expect(JSON.stringify(result)).not.toContain('secreto');
    consoleSpy.mockRestore();
  });
});
