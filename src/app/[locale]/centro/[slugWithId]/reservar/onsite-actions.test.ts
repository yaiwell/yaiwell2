import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests de las actions del pago en el local: auth, sustitución de la
 * `pending` propia, aviso de confirmación y mapeo de errores.
 */

const mocks = vi.hoisted(() => {
  class OnsitePaymentNotAllowedError extends Error {
    constructor(
      readonly reason: string,
      readonly restrictedUntil: Date | null = null,
    ) {
      super('no');
    }
  }
  return {
    auth: vi.fn(),
    createOnsiteBooking: vi.fn(),
    getPaymentOptions: vi.fn(),
    getBookingForConfirmation: vi.fn(),
    cancelBookingByClientWithRefund: vi.fn(),
    scheduleNotification: vi.fn((task: () => Promise<void>) => void task()),
    notifyBookingConfirmed: vi.fn(async () => {}),
    OnsitePaymentNotAllowedError,
  };
});

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/services/user', () => ({
  ensureUserFromClerk: vi.fn(async () => ({ id: 'user-1' })),
}));
vi.mock('@/lib/services/checkout', () => ({
  OnsitePaymentNotAllowedError: mocks.OnsitePaymentNotAllowedError,
  ProfessionalNotResolvedError: class ProfessionalNotResolvedError extends Error {},
  cancelBookingByClientWithRefund: mocks.cancelBookingByClientWithRefund,
  createOnsiteBooking: mocks.createOnsiteBooking,
  getBookingForConfirmation: mocks.getBookingForConfirmation,
  getPaymentOptions: mocks.getPaymentOptions,
}));
vi.mock('@/lib/services/notifications', () => ({
  notifyBookingConfirmed: mocks.notifyBookingConfirmed,
  scheduleNotification: mocks.scheduleNotification,
}));
// Errores y detector reales del dominio booking, sin arrastrar Prisma.
vi.mock('@/lib/services/booking', async () => {
  const errors = await import('@/lib/services/booking/booking.errors');
  const validation = await import('@/lib/services/booking/booking.validation');
  return { ...errors, isBookingTooSoonError: validation.isBookingTooSoonError };
});

import {
  BookingNotCancellableError,
  SlotUnavailableError,
} from '@/lib/services/booking/booking.errors';

import { createOnsiteBookingAction, getPaymentOptionsAction } from './onsite-actions';

const PENDING_ID = '6f1c1f9e-8a0b-4c55-9a51-0d2b6c1e7a10';
const INPUT = { serviceId: 'svc-1', slotStartIso: '2026-11-10T17:30:00.000Z', notes: 'Hola' };
const CREATED = {
  bookingId: 'bk-new',
  paymentMode: 'onsite',
  amountCents: 3000,
  originalPriceCents: null,
  discountPct: null,
  slotStartIso: INPUT.slotStartIso,
  slotEndIso: '2026-11-10T18:30:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.auth.mockResolvedValue({ userId: 'clerk_1' });
  // Como el servicio real: valida y, solo si se puede, suelta la pending.
  mocks.createOnsiteBooking.mockImplementation(
    async (_input, _client, _now, hooks?: { releasePending?: () => Promise<void> }) => {
      await hooks?.releasePending?.();
      return CREATED;
    },
  );
});

describe('createOnsiteBookingAction', () => {
  it('sin sesión no crea nada', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    expect(await createOnsiteBookingAction(INPUT)).toEqual({ ok: false, code: 'UNAUTHENTICATED' });
    expect(mocks.createOnsiteBooking).not.toHaveBeenCalled();
  });

  it('crea la reserva y programa la confirmación al cliente y al negocio', async () => {
    const result = await createOnsiteBookingAction(INPUT);

    expect(result).toMatchObject({ ok: true, bookingId: 'bk-new', amountCents: 3000 });
    expect(mocks.createOnsiteBooking).toHaveBeenCalledWith(
      { serviceId: 'svc-1', slotStartIso: INPUT.slotStartIso, notes: 'Hola' },
      'user-1',
      expect.any(Date),
      {},
    );
    expect(mocks.notifyBookingConfirmed).toHaveBeenCalledWith('bk-new');
  });

  it('suelta antes la pending propia que retenía la franja', async () => {
    mocks.getBookingForConfirmation.mockResolvedValue({ status: 'pending' });

    await createOnsiteBookingAction({ ...INPUT, replacesPendingBookingId: PENDING_ID });

    expect(mocks.cancelBookingByClientWithRefund).toHaveBeenCalledWith(
      { bookingId: PENDING_ID },
      'user-1',
    );
    // Se suelta dentro del servicio (hook), tras validar el local.
    expect(mocks.notifyBookingConfirmed).toHaveBeenCalledWith('bk-new');
  });

  it('si la pending ya caducó, sigue adelante', async () => {
    mocks.getBookingForConfirmation.mockResolvedValue({ status: 'pending' });
    mocks.cancelBookingByClientWithRefund.mockRejectedValue(new BookingNotCancellableError());

    const result = await createOnsiteBookingAction({
      ...INPUT,
      replacesPendingBookingId: PENDING_ID,
    });

    expect(result.ok).toBe(true);
  });

  it('si la pending ya está pagada, no la cancela ni crea otra', async () => {
    mocks.getBookingForConfirmation.mockResolvedValue({ status: 'confirmed' });

    const result = await createOnsiteBookingAction({
      ...INPUT,
      replacesPendingBookingId: PENDING_ID,
    });

    expect(result).toEqual({ ok: false, code: 'PENDING_ALREADY_PAID' });
    expect(mocks.cancelBookingByClientWithRefund).not.toHaveBeenCalled();
    expect(mocks.notifyBookingConfirmed).not.toHaveBeenCalled();
  });

  it('rechaza un id de pending que no es UUID', async () => {
    const result = await createOnsiteBookingAction({ ...INPUT, replacesPendingBookingId: 'x' });
    expect(result).toEqual({ ok: false, code: 'VALIDATION' });
  });

  it('cliente bloqueado: devuelve el motivo y hasta cuándo', async () => {
    const until = new Date('2027-02-10T00:00:00.000Z');
    mocks.createOnsiteBooking.mockRejectedValue(
      new mocks.OnsitePaymentNotAllowedError('client_restricted', until),
    );

    expect(await createOnsiteBookingAction(INPUT)).toEqual({
      ok: false,
      code: 'ONSITE_NOT_ALLOWED',
      reason: 'client_restricted',
      restrictedUntilIso: until.toISOString(),
    });
    expect(mocks.scheduleNotification).not.toHaveBeenCalled();
  });

  it('tope de reservas en el local: devuelve limit_reached sin fecha', async () => {
    mocks.createOnsiteBooking.mockRejectedValue(
      new mocks.OnsitePaymentNotAllowedError('limit_reached'),
    );
    expect(await createOnsiteBookingAction(INPUT)).toEqual({
      ok: false,
      code: 'ONSITE_NOT_ALLOWED',
      reason: 'limit_reached',
      restrictedUntilIso: null,
    });
  });

  it.each([
    ['cliente bloqueado', 'client_restricted'],
    ['a 1h59 (última hora)', 'last_minute'],
    ['con 3 reservas en el local', 'limit_reached'],
  ])('%s con pending que sustituir → no la cancela', async (_label, reason) => {
    // El servicio valida antes de llamar a `releasePending`: aquí lanza
    // sin llamarlo, como haría con el local no permitido.
    mocks.createOnsiteBooking.mockRejectedValue(new mocks.OnsitePaymentNotAllowedError(reason));
    mocks.getBookingForConfirmation.mockResolvedValue({ status: 'pending' });

    const result = await createOnsiteBookingAction({
      ...INPUT,
      replacesPendingBookingId: PENDING_ID,
    });

    expect(result).toMatchObject({ ok: false, code: 'ONSITE_NOT_ALLOWED', reason });
    expect(mocks.cancelBookingByClientWithRefund).not.toHaveBeenCalled();
  });

  it('hueco ocupado → SLOT_UNAVAILABLE', async () => {
    mocks.createOnsiteBooking.mockRejectedValue(new SlotUnavailableError());
    expect(await createOnsiteBookingAction(INPUT)).toEqual({
      ok: false,
      code: 'SLOT_UNAVAILABLE',
    });
  });
});

describe('getPaymentOptionsAction', () => {
  const OPTIONS = { online: 'available', onsite: 'available', restrictedUntilIso: null };

  it('sin sesión consulta sin cliente', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    mocks.getPaymentOptions.mockResolvedValue(OPTIONS);

    expect(await getPaymentOptionsAction(INPUT)).toEqual({ ok: true, options: OPTIONS });
    expect(mocks.getPaymentOptions).toHaveBeenCalledWith(INPUT, null);
  });

  it('con sesión pasa el cliente para mirar su bloqueo', async () => {
    mocks.getPaymentOptions.mockResolvedValue(OPTIONS);
    await getPaymentOptionsAction(INPUT);
    expect(mocks.getPaymentOptions).toHaveBeenCalledWith(INPUT, 'user-1');
  });

  it('si falla, la UI se queda con online', async () => {
    mocks.getPaymentOptions.mockRejectedValue(new Error('db down'));
    expect(await getPaymentOptionsAction(INPUT)).toEqual({ ok: false });
  });
});
