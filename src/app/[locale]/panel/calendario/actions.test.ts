/**
 * Tests de las acciones del calendario: solo se programa un correo
 * cuando el cambio de estado se aplicó de verdad.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  class BookingTooLateToCancelError extends Error {}
  class BookingNotConfirmedError extends Error {}
  class BookingNotCancellableError extends Error {}
  class BookingNotFoundError extends Error {}
  class UnauthorizedCancellationError extends Error {}
  return {
    errors: {
      BookingTooLateToCancelError,
      BookingNotConfirmedError,
      BookingNotCancellableError,
      BookingNotFoundError,
      UnauthorizedCancellationError,
    },
    resolveProviderOwner: vi.fn(),
    markBookingCompleted: vi.fn(),
    cancelWithRefund: vi.fn(),
    scheduleNotification: vi.fn((task: () => Promise<void>) => void task()),
    notifyBookingCompleted: vi.fn(async () => {}),
    notifyBookingCancelledByProvider: vi.fn(async () => {}),
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./provider-owner', () => ({ resolveProviderOwner: mocks.resolveProviderOwner }));
vi.mock('@/lib/services/booking', () => ({
  ...mocks.errors,
  markBookingCompleted: mocks.markBookingCompleted,
}));
vi.mock('@/lib/services/checkout', () => ({
  cancelBookingByProviderWithRefund: mocks.cancelWithRefund,
}));
vi.mock('@/lib/services/notifications', async () => {
  const { toCancellationRefundState } =
    await import('@/lib/services/notifications/notifications.refund-state');
  return {
    scheduleNotification: mocks.scheduleNotification,
    notifyBookingCompleted: mocks.notifyBookingCompleted,
    notifyBookingCancelledByProvider: mocks.notifyBookingCancelledByProvider,
    toCancellationRefundState,
  };
});

import { cancelBookingAction, completeBookingAction } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.resolveProviderOwner.mockResolvedValue({ userId: 'owner-1' });
});

describe('completeBookingAction', () => {
  it('invita a valorar tras finalizar la cita', async () => {
    mocks.markBookingCompleted.mockResolvedValue(undefined);
    expect(await completeBookingAction('es', 'bk-1')).toEqual({ ok: true });
    expect(mocks.notifyBookingCompleted).toHaveBeenCalledWith('bk-1');
  });

  it('no envía nada si la reserva no estaba confirmada', async () => {
    mocks.markBookingCompleted.mockRejectedValue(new mocks.errors.BookingNotConfirmedError());
    const result = await completeBookingAction('es', 'bk-1');
    expect(result).toMatchObject({ ok: false, code: 'NOT_CONFIRMED' });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });

  it('no envía nada sin negocio autenticado', async () => {
    mocks.resolveProviderOwner.mockResolvedValue(null);
    expect(await completeBookingAction('es', 'bk-1')).toMatchObject({ code: 'FORBIDDEN' });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });
});

describe('cancelBookingAction', () => {
  it('avisa al cliente con el estado del reembolso', async () => {
    mocks.cancelWithRefund.mockResolvedValue({ refund: 'issued' });
    expect(await cancelBookingAction('es', 'bk-1')).toEqual({ ok: true });
    expect(mocks.notifyBookingCancelledByProvider).toHaveBeenCalledWith('bk-1', 'refunded');
  });

  it('con el reembolso fallido avisa igual, como en trámite', async () => {
    mocks.cancelWithRefund.mockResolvedValue({ refund: 'failed' });
    expect(await cancelBookingAction('es', 'bk-1')).toMatchObject({ code: 'REFUND_FAILED' });
    expect(mocks.notifyBookingCancelledByProvider).toHaveBeenCalledWith('bk-1', 'refund_pending');
  });

  it('sin saber si hubo cobro no promete reembolso', async () => {
    mocks.cancelWithRefund.mockResolvedValue({ refund: 'failed', paymentUncertain: true });
    await cancelBookingAction('es', 'bk-1');
    expect(mocks.notifyBookingCancelledByProvider).toHaveBeenCalledWith('bk-1', 'refund_uncertain');
  });

  it('no envía nada si faltan menos de 2 h', async () => {
    mocks.cancelWithRefund.mockRejectedValue(new mocks.errors.BookingTooLateToCancelError());
    expect(await cancelBookingAction('es', 'bk-1')).toMatchObject({ code: 'TOO_LATE' });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });
});
