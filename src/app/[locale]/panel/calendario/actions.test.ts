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
  class BookingNotNoShowError extends Error {}
  class BookingNotStartedError extends Error {}
  class NoShowUndoWindowClosedError extends Error {}
  class NoShowWindowClosedError extends Error {}
  class SlotUnavailableError extends Error {}
  return {
    errors: {
      BookingTooLateToCancelError,
      BookingNotConfirmedError,
      BookingNotCancellableError,
      BookingNotFoundError,
      UnauthorizedCancellationError,
      BookingNotNoShowError,
      BookingNotStartedError,
      NoShowUndoWindowClosedError,
      NoShowWindowClosedError,
      SlotUnavailableError,
    },
    resolveProviderOwner: vi.fn(),
    markBookingCompleted: vi.fn(),
    markBookingNoShow: vi.fn(),
    undoBookingNoShow: vi.fn(),
    scheduleCommissionItemization: vi.fn(),
    notifyBookingNoShow: vi.fn(async () => {}),
    notifyNoShowUndone: vi.fn(async () => {}),
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
  markBookingNoShow: mocks.markBookingNoShow,
  undoBookingNoShow: mocks.undoBookingNoShow,
}));
vi.mock('@/lib/services/billing', () => ({
  scheduleCommissionItemization: mocks.scheduleCommissionItemization,
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
    notifyBookingNoShow: mocks.notifyBookingNoShow,
    notifyNoShowUndone: mocks.notifyNoShowUndone,
    notifyBookingCancelledByProvider: mocks.notifyBookingCancelledByProvider,
    toCancellationRefundState,
  };
});

import {
  cancelBookingAction,
  completeBookingAction,
  markNoShowAction,
  undoNoShowAction,
} from './actions';

const BOOKING_ID = '6f1c1f9e-8a0b-4c55-9a51-0d2b6c1e7a10';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.resolveProviderOwner.mockResolvedValue({ userId: 'owner-1' });
});

describe('completeBookingAction', () => {
  it('invita a valorar tras finalizar la cita', async () => {
    mocks.markBookingCompleted.mockResolvedValue({ onsiteCommissionChargeId: null });
    expect(await completeBookingAction('es', 'bk-1')).toEqual({ ok: true });
    expect(mocks.notifyBookingCompleted).toHaveBeenCalledWith('bk-1');
    expect(mocks.scheduleCommissionItemization).toHaveBeenCalledWith(null);
  });

  it('en el local, programa el paso a Stripe de la comisión encolada', async () => {
    mocks.markBookingCompleted.mockResolvedValue({
      paymentMode: 'onsite',
      onsiteCommissionChargeId: 'chg-1',
    });
    expect(await completeBookingAction('es', 'bk-1')).toEqual({ ok: true });
    expect(mocks.scheduleCommissionItemization).toHaveBeenCalledWith('chg-1');
  });

  it('no envía nada si la reserva no estaba confirmada', async () => {
    mocks.markBookingCompleted.mockRejectedValue(new mocks.errors.BookingNotConfirmedError());
    const result = await completeBookingAction('es', 'bk-1');
    expect(result).toMatchObject({ ok: false, code: 'NOT_CONFIRMED' });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });

  it('antes del inicio → NOT_STARTED, sin correo ni comisión', async () => {
    mocks.markBookingCompleted.mockRejectedValue(new mocks.errors.BookingNotStartedError());
    expect(await completeBookingAction('es', 'bk-1')).toEqual({ ok: false, code: 'NOT_STARTED' });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
    expect(mocks.scheduleCommissionItemization).not.toHaveBeenCalled();
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

describe('markNoShowAction', () => {
  it('en el local avisa al cliente con la sanción y el bloqueo', async () => {
    const until = new Date('2027-02-10T00:00:00.000Z');
    mocks.markBookingNoShow.mockResolvedValue({
      changed: true,
      sanctionApplied: true,
      eligibility: { sanctionsInWindow: 3, restrictedUntil: until },
    });
    expect(await markNoShowAction('es', BOOKING_ID)).toEqual({ ok: true });
    expect(mocks.markBookingNoShow).toHaveBeenCalledWith(BOOKING_ID, 'owner-1');
    expect(mocks.notifyBookingNoShow).toHaveBeenCalledWith(BOOKING_ID, {
      sanctionApplied: true,
      sanctionsInWindow: 3,
      restrictedUntil: until,
    });
  });

  it('un doble clic (sin cambio) no manda otro correo', async () => {
    mocks.markBookingNoShow.mockResolvedValue({
      changed: false,
      sanctionApplied: false,
      eligibility: null,
    });
    expect(await markNoShowAction('es', BOOKING_ID)).toEqual({ ok: true });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });

  it.each([
    ['BookingNotStartedError', 'NOT_STARTED'],
    ['NoShowWindowClosedError', 'WINDOW_CLOSED'],
    ['BookingNotConfirmedError', 'NOT_CONFIRMED'],
    ['UnauthorizedCancellationError', 'FORBIDDEN'],
  ] as const)('%s → %s', async (errorName, code) => {
    mocks.markBookingNoShow.mockRejectedValue(new mocks.errors[errorName]());
    expect(await markNoShowAction('es', BOOKING_ID)).toEqual({ ok: false, code });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });

  it('rechaza un id que no es UUID sin tocar el dominio', async () => {
    expect(await markNoShowAction('es', 'bk-1')).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(mocks.markBookingNoShow).not.toHaveBeenCalled();
  });

  it('sin negocio autenticado devuelve FORBIDDEN', async () => {
    mocks.resolveProviderOwner.mockResolvedValue(null);
    expect(await markNoShowAction('es', BOOKING_ID)).toEqual({ ok: false, code: 'FORBIDDEN' });
  });
});

describe('undoNoShowAction', () => {
  it('dentro de las 72 h vuelve a confirmada: avisa de la sanción retirada, sin comisión', async () => {
    mocks.undoBookingNoShow.mockResolvedValue({
      status: 'confirmed',
      sanctionRevoked: true,
      onsiteCommissionChargeId: null,
    });
    expect(await undoNoShowAction('es', BOOKING_ID)).toEqual({ ok: true });
    expect(mocks.notifyNoShowUndone).toHaveBeenCalledWith(BOOKING_ID, true, expect.any(Date));
    expect(mocks.notifyBookingCompleted).not.toHaveBeenCalled();
    expect(mocks.scheduleCommissionItemization).not.toHaveBeenCalled();
  });

  it('pasadas las 72 h queda completada: invita a valorar y factura la comisión', async () => {
    mocks.undoBookingNoShow.mockResolvedValue({
      status: 'completed',
      onsiteCommissionChargeId: 'chg-2',
    });
    expect(await undoNoShowAction('es', BOOKING_ID)).toEqual({ ok: true });
    expect(mocks.notifyBookingCompleted).toHaveBeenCalledWith(BOOKING_ID);
    expect(mocks.scheduleCommissionItemization).toHaveBeenCalledWith('chg-2');
  });

  it.each([
    ['NoShowUndoWindowClosedError', 'UNDO_WINDOW_CLOSED'],
    ['BookingNotNoShowError', 'NOT_NO_SHOW'],
    ['SlotUnavailableError', 'SLOT_TAKEN'],
  ] as const)('%s → %s', async (errorName, code) => {
    mocks.undoBookingNoShow.mockRejectedValue(new mocks.errors[errorName]());
    expect(await undoNoShowAction('es', BOOKING_ID)).toEqual({ ok: false, code });
  });
});
