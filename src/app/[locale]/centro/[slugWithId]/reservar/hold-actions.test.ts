/**
 * Tests de la comprobación previa al pago (`verifyBookingPayableAction`).
 *
 * Se fija que los errores tipados del dominio lleguen como códigos
 * estables y que sin sesión no se toque nada.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { authMock, checkMock, errors } = vi.hoisted(() => {
  class BookingForCheckoutNotFoundError extends Error {}
  class BookingHoldExpiredError extends Error {}
  return {
    authMock: vi.fn(),
    checkMock: vi.fn(),
    errors: { BookingForCheckoutNotFoundError, BookingHoldExpiredError },
  };
});

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('@/lib/services/user', () => ({
  ensureUserFromClerk: vi.fn(async () => ({ id: 'user-1' })),
}));
vi.mock('@/lib/services/checkout', () => ({
  checkBookingPayable: checkMock,
  BookingForCheckoutNotFoundError: errors.BookingForCheckoutNotFoundError,
  BookingHoldExpiredError: errors.BookingHoldExpiredError,
}));

import { verifyBookingPayableAction } from './hold-actions';

const INPUT = { bookingId: '9a1f7c2d-3b4e-4f5a-8b9c-0d1e2f3a4b5c' };

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: 'clerk_1' });
});

describe('verifyBookingPayableAction', () => {
  it('sin sesión responde UNAUTHENTICATED sin consultar la reserva', async () => {
    authMock.mockResolvedValue({ userId: null });

    expect(await verifyBookingPayableAction(INPUT)).toEqual({
      ok: false,
      code: 'UNAUTHENTICATED',
    });
    expect(checkMock).not.toHaveBeenCalled();
  });

  it('deja pagar si la reserva retiene su franja', async () => {
    checkMock.mockResolvedValue('payable');

    expect(await verifyBookingPayableAction(INPUT)).toEqual({ ok: true });
    expect(checkMock).toHaveBeenCalledWith(INPUT, 'user-1');
  });

  it('avisa de que ya está pagada', async () => {
    checkMock.mockResolvedValue('already_paid');
    expect(await verifyBookingPayableAction(INPUT)).toEqual({ ok: false, code: 'ALREADY_PAID' });
  });

  it.each([
    [new errors.BookingHoldExpiredError(), 'HOLD_EXPIRED'],
    [new errors.BookingForCheckoutNotFoundError(), 'NOT_FOUND'],
    [z.object({ id: z.string().uuid() }).safeParse({ id: 'x' }).error, 'VALIDATION'],
  ])('traduce %o a %s', async (error, code) => {
    checkMock.mockRejectedValue(error);
    expect(await verifyBookingPayableAction(INPUT)).toEqual({ ok: false, code });
  });

  it('no filtra el mensaje de un error inesperado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    checkMock.mockRejectedValue(new Error('secreto de la BD'));

    const result = await verifyBookingPayableAction(INPUT);

    expect(result).toEqual({ ok: false, code: 'INTERNAL' });
    expect(JSON.stringify(result)).not.toContain('secreto');
  });
});
