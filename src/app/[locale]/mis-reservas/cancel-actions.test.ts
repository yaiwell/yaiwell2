import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de `cancelMyBookingAction`.
 *
 * Fija el contrato del borde: locale y entrada validados, sesión
 * obligatoria, el `User.id` interno (no el de Clerk) llega al service,
 * cada error tipado se traduce a un código estable, y los avisos y la
 * revalidación solo ocurren cuando la reserva se ha cancelado. Las
 * reglas en sí las prueban los tests de booking y checkout.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  ensureUserFromClerk: vi.fn(),
  cancelBookingByClientWithRefund: vi.fn(),
  notifyBookingCancelledByClient: vi.fn(),
  scheduleNotification: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/services/user', () => ({ ensureUserFromClerk: mocks.ensureUserFromClerk }));
vi.mock('@/lib/services/checkout', () => ({
  cancelBookingByClientWithRefund: mocks.cancelBookingByClientWithRefund,
}));
vi.mock('@/lib/services/notifications', async () => {
  const refundState = await import('@/lib/services/notifications/notifications.refund-state');
  return {
    ...refundState,
    notifyBookingCancelledByClient: mocks.notifyBookingCancelledByClient,
    scheduleNotification: mocks.scheduleNotification,
  };
});
// Errores reales del dominio booking, sin arrastrar Prisma.
vi.mock('@/lib/services/booking', () => import('@/lib/services/booking/booking.errors'));

import {
  BookingNotCancellableError,
  BookingNotFoundError,
  BookingTooLateToCancelError,
  LastMinuteBookingNotCancellableError,
  UnauthorizedCancellationError,
} from '@/lib/services/booking/booking.errors';

import { cancelMyBookingAction } from './cancel-actions';

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INPUT = { bookingId: BOOKING_ID };

function issued(overrides: Record<string, unknown> = {}) {
  return {
    bookingId: BOOKING_ID,
    status: 'cancelled',
    refund: 'issued',
    stripeRefundId: 're_1',
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ userId: 'clerk_1' });
  mocks.ensureUserFromClerk.mockResolvedValue({ id: 'user-1' });
  mocks.cancelBookingByClientWithRefund.mockResolvedValue(issued());
});

describe('cancelMyBookingAction', () => {
  it('cancela con el User.id interno, avisa y revalida /mis-reservas', async () => {
    await expect(cancelMyBookingAction('es', INPUT)).resolves.toEqual({
      ok: true,
      refund: 'refunded',
    });

    expect(mocks.cancelBookingByClientWithRefund).toHaveBeenCalledWith(INPUT, 'user-1');
    expect(mocks.scheduleNotification).toHaveBeenCalledOnce();
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/es/mis-reservas');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/[locale]/panel/calendario', 'page');

    // La tarea programada avisa con el estado del dinero.
    await mocks.scheduleNotification.mock.calls[0][0]();
    expect(mocks.notifyBookingCancelledByClient).toHaveBeenCalledWith(
      BOOKING_ID,
      'refunded',
      false,
    );
  });

  it('pasa al aviso que la oferta de origen vuelve a anunciarse', async () => {
    mocks.cancelBookingByClientWithRefund.mockResolvedValue(issued({ offerReopened: true }));

    await cancelMyBookingAction('es', INPUT);
    await mocks.scheduleNotification.mock.calls[0][0]();

    expect(mocks.notifyBookingCancelledByClient).toHaveBeenCalledWith(BOOKING_ID, 'refunded', true);
  });

  it('un reembolso fallido sigue siendo cancelación hecha (refund_pending)', async () => {
    mocks.cancelBookingByClientWithRefund.mockResolvedValue(issued({ refund: 'failed' }));

    await expect(cancelMyBookingAction('es', INPUT)).resolves.toEqual({
      ok: true,
      refund: 'refund_pending',
    });
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  it('sin cobro (pending) devuelve no_payment', async () => {
    mocks.cancelBookingByClientWithRefund.mockResolvedValue(issued({ refund: 'not_applicable' }));

    await expect(cancelMyBookingAction('es', INPUT)).resolves.toEqual({
      ok: true,
      refund: 'no_payment',
    });
  });

  it('FORBIDDEN sin sesión, sin llamar al service', async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    await expect(cancelMyBookingAction('es', INPUT)).resolves.toEqual({
      ok: false,
      code: 'FORBIDDEN',
    });
    expect(mocks.cancelBookingByClientWithRefund).not.toHaveBeenCalled();
  });

  it('VALIDATION con un locale no soportado o un id que no es UUID', async () => {
    await expect(cancelMyBookingAction('fr', INPUT)).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    await expect(cancelMyBookingAction('es', { bookingId: 'nope' })).resolves.toEqual({
      ok: false,
      code: 'VALIDATION',
    });
    expect(mocks.cancelBookingByClientWithRefund).not.toHaveBeenCalled();
  });

  it.each([
    [new BookingNotFoundError(), 'FORBIDDEN'],
    [new UnauthorizedCancellationError(), 'FORBIDDEN'],
    [new LastMinuteBookingNotCancellableError(), 'LAST_MINUTE'],
    [new BookingTooLateToCancelError(), 'TOO_LATE'],
    [new BookingNotCancellableError(), 'NOT_CANCELLABLE'],
  ])('traduce %s a %s sin avisar ni revalidar', async (error, code) => {
    mocks.cancelBookingByClientWithRefund.mockRejectedValue(error);

    await expect(cancelMyBookingAction('es', INPUT)).resolves.toEqual({ ok: false, code });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('INTERNAL ante un error inesperado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.cancelBookingByClientWithRefund.mockRejectedValue(new Error('db down'));

    await expect(cancelMyBookingAction('es', INPUT)).resolves.toEqual({
      ok: false,
      code: 'INTERNAL',
    });
  });
});
