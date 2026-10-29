/**
 * Tests de la server action que descarta entradas de la cola de
 * reembolsos (/admin/reembolsos).
 *
 * Lo que se protege: un no admin nunca escribe, el motivo corto se
 * rechaza en el borde sin tocar BD, la auditoría usa el `User.id`
 * interno (no el de Clerk) y los errores tipados llegan como códigos.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireRoleMock, dismissMock, revalidatePathMock, ensureUserMock, errors } = vi.hoisted(
  () => {
    class BookingForCheckoutNotFoundError extends Error {}
    class RefundNotInQueueError extends Error {}
    class RefundNotDismissableError extends Error {}
    return {
      requireRoleMock: vi.fn(),
      dismissMock: vi.fn(),
      revalidatePathMock: vi.fn(),
      ensureUserMock: vi.fn(),
      errors: { BookingForCheckoutNotFoundError, RefundNotInQueueError, RefundNotDismissableError },
    };
  },
);

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/auth/server', () => ({ requireRole: requireRoleMock }));
vi.mock('@/lib/services/user', () => ({ ensureUserFromClerk: ensureUserMock }));
vi.mock('@/lib/services/notifications', () => ({
  scheduleNotification: vi.fn(),
  notifyRefundCompleted: vi.fn(),
}));
vi.mock('@/lib/services/checkout', async () => {
  // Schema real: lo que se prueba es justo la validación en el borde.
  const validation = await import('@/lib/services/checkout/checkout.validation');
  return {
    dismissBookingRefund: dismissMock,
    dismissBookingRefundSchema: validation.dismissBookingRefundSchema,
    retryBookingRefund: vi.fn(),
    ...errors,
  };
});

import { dismissRefundAction } from './actions';

const BOOKING_ID = '6f1c2b8e-1d2a-4c3b-9e4f-5a6b7c8d9e0f';
const REASON = 'pi_cancel_failed sin cobro real en Stripe';

describe('dismissRefundAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 'clerk_admin', role: 'admin' });
    ensureUserMock.mockResolvedValue({ id: 'admin-user-1' });
    dismissMock.mockResolvedValue({ bookingId: BOOKING_ID, dismissedAt: new Date() });
  });

  it('rechaza a un no admin sin tocar BD', async () => {
    requireRoleMock.mockRejectedValue(new Error('NEXT_REDIRECT'));

    const result = await dismissRefundAction('es', BOOKING_ID, REASON);

    expect(result).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(requireRoleMock).toHaveBeenCalledWith(['admin'], 'es');
    expect(dismissMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('rechaza un locale no soportado sin comprobar el rol', async () => {
    const result = await dismissRefundAction('xx' as never, BOOKING_ID, REASON);

    expect(result).toEqual({ ok: false, code: 'VALIDATION' });
    expect(requireRoleMock).not.toHaveBeenCalled();
  });

  it.each(['', 'ok', '   abc   '])(
    'rechaza el motivo corto %j con INVALID_REASON',
    async (reason) => {
      const result = await dismissRefundAction('es', BOOKING_ID, reason);

      expect(result).toEqual({ ok: false, code: 'INVALID_REASON' });
      expect(dismissMock).not.toHaveBeenCalled();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  it('rechaza un id inválido con VALIDATION', async () => {
    expect(await dismissRefundAction('es', 'x', REASON)).toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    expect(dismissMock).not.toHaveBeenCalled();
  });

  it('descarta con el User.id interno del admin y revalida la página', async () => {
    const result = await dismissRefundAction('ca', BOOKING_ID, `  ${REASON} `);

    expect(result).toEqual({ ok: true });
    expect(ensureUserMock).toHaveBeenCalledWith('clerk_admin');
    expect(dismissMock).toHaveBeenCalledWith(
      { bookingId: BOOKING_ID, reason: REASON },
      'admin-user-1',
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/ca/admin/reembolsos');
  });

  it.each([
    [new errors.BookingForCheckoutNotFoundError(), 'BOOKING_NOT_FOUND'],
    [new errors.RefundNotInQueueError(), 'NOT_IN_QUEUE'],
    [new errors.RefundNotDismissableError(), 'NOT_DISMISSABLE'],
  ])('traduce %o a %s', async (error, code) => {
    dismissMock.mockRejectedValue(error);

    expect(await dismissRefundAction('es', BOOKING_ID, REASON)).toEqual({ ok: false, code });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('no filtra el mensaje de un error inesperado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dismissMock.mockRejectedValue(new Error('secreto interno'));

    const result = await dismissRefundAction('es', BOOKING_ID, REASON);

    expect(result).toEqual({ ok: false, code: 'INTERNAL' });
    expect(JSON.stringify(result)).not.toContain('secreto');
  });
});
