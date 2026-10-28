/**
 * Tests de las server actions de huecos liberados con descuento.
 *
 * Se protege el borde: locale válido, autenticación del dueño, que el
 * `providerId` y el `User.id` salen de la sesión (no del cliente), la
 * traducción de errores tipados a códigos opacos y el `revalidatePath`
 * solo cuando la operación sale bien.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

const {
  requireCurrentProviderMock,
  findProviderMock,
  revalidatePathMock,
  releaseCancelledSlotMock,
  releaseFreeSlotMock,
  withdrawSlotOfferMock,
} = vi.hoisted(() => ({
  requireCurrentProviderMock: vi.fn(),
  findProviderMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  releaseCancelledSlotMock: vi.fn(),
  releaseFreeSlotMock: vi.fn(),
  withdrawSlotOfferMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/auth/server', () => ({ requireCurrentProvider: requireCurrentProviderMock }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { provider: { findUnique: findProviderMock } } }));
vi.mock('@/lib/services/slot-offers', async () => {
  // Los errores reales: la action los distingue con `instanceof`.
  const errors = await import('@/lib/services/slot-offers/slot-offers.errors');
  return {
    ...errors,
    releaseCancelledSlot: releaseCancelledSlotMock,
    releaseFreeSlot: releaseFreeSlotMock,
    withdrawSlotOffer: withdrawSlotOfferMock,
  };
});

import {
  SlotOfferAlreadyExistsError,
  SlotOfferForbiddenError,
  SlotOfferNotFoundError,
  SlotOfferOutsideWindowError,
  SlotOfferServiceInvalidError,
  SlotOfferSlotTakenError,
  SlotOfferSourceNotCancelledError,
} from '@/lib/services/slot-offers/slot-offers.errors';
import type { AppLocale } from '@/i18n/routing';

import {
  releaseCancelledSlotAction,
  releaseFreeSlotAction,
  withdrawSlotOfferAction,
} from './slot-offers.actions';

const DISCOUNTS = { over2h: 10, oneToTwoHours: 20, underOneHour: 30 };

describe('slot-offers actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentProviderMock.mockResolvedValue({ id: 'provider-1' });
    findProviderMock.mockResolvedValue({ userId: 'user-1' });
    releaseCancelledSlotMock.mockResolvedValue({ id: 'offer-1' });
    releaseFreeSlotMock.mockResolvedValue({ id: 'offer-2' });
    withdrawSlotOfferMock.mockResolvedValue(undefined);
  });

  it('libera el hueco de una reserva cancelada con el User.id de la sesión', async () => {
    const result = await releaseCancelledSlotAction('es', {
      bookingId: 'bk-1',
      discounts: DISCOUNTS,
    });

    expect(result).toEqual({ ok: true });
    expect(releaseCancelledSlotMock).toHaveBeenCalledWith(
      { bookingId: 'bk-1', discounts: DISCOUNTS },
      'user-1',
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/es/panel/calendario');
  });

  it('libera un hueco libre con el providerId de la sesión, no del cliente', async () => {
    const result = await releaseFreeSlotAction('ca', {
      serviceId: 'svc-1',
      startAtIso: '2026-10-28T10:00:00.000Z',
      discounts: { over2h: 0, oneToTwoHours: 20, underOneHour: 30 },
    });

    expect(result).toEqual({ ok: true });
    expect(releaseFreeSlotMock).toHaveBeenCalledWith(
      {
        serviceId: 'svc-1',
        startAt: '2026-10-28T10:00:00.000Z',
        discounts: { over2h: 0, oneToTwoHours: 20, underOneHour: 30 },
      },
      'user-1',
      'provider-1',
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/ca/panel/calendario');
  });

  it('retira una oferta y revalida el calendario', async () => {
    const result = await withdrawSlotOfferAction('en', 'offer-1');

    expect(result).toEqual({ ok: true });
    expect(withdrawSlotOfferMock).toHaveBeenCalledWith({ offerId: 'offer-1' }, 'user-1');
    expect(revalidatePathMock).toHaveBeenCalledWith('/en/panel/calendario');
  });

  it('rechaza un locale desconocido sin tocar la sesión ni el service', async () => {
    const result = await withdrawSlotOfferAction('fr' as AppLocale, 'offer-1');

    expect(result).toEqual({ ok: false, code: 'INVALID_INPUT' });
    expect(requireCurrentProviderMock).not.toHaveBeenCalled();
    expect(withdrawSlotOfferMock).not.toHaveBeenCalled();
  });

  it('devuelve FORBIDDEN si no hay provider autenticado', async () => {
    requireCurrentProviderMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));

    const result = await releaseCancelledSlotAction('es', {
      bookingId: 'bk-1',
      discounts: DISCOUNTS,
    });

    expect(result).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(releaseCancelledSlotMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('devuelve FORBIDDEN si el provider no tiene dueño en BD', async () => {
    findProviderMock.mockResolvedValueOnce(null);

    const result = await withdrawSlotOfferAction('es', 'offer-1');

    expect(result).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(withdrawSlotOfferMock).not.toHaveBeenCalled();
  });

  it.each([
    [new SlotOfferNotFoundError(), 'NOT_FOUND'],
    [new SlotOfferForbiddenError(), 'FORBIDDEN'],
    [new SlotOfferSourceNotCancelledError(), 'NOT_CANCELLED'],
    [new SlotOfferSlotTakenError(), 'SLOT_TAKEN'],
    [new SlotOfferOutsideWindowError(), 'OUTSIDE_WINDOW'],
    [new SlotOfferAlreadyExistsError(), 'ALREADY_EXISTS'],
    [new SlotOfferServiceInvalidError(), 'SERVICE_INVALID'],
    [new ZodError([]), 'INVALID_INPUT'],
  ])('traduce %s al código opaco %s sin revalidar', async (error, code) => {
    releaseCancelledSlotMock.mockRejectedValueOnce(error);

    const result = await releaseCancelledSlotAction('es', {
      bookingId: 'bk-1',
      discounts: DISCOUNTS,
    });

    expect(result).toEqual({ ok: false, code });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('oculta los errores inesperados como INTERNAL y los registra', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    releaseFreeSlotMock.mockRejectedValueOnce(new Error('connection reset'));

    const result = await releaseFreeSlotAction('es', {
      serviceId: 'svc-1',
      startAtIso: '2026-10-28T10:00:00.000Z',
      discounts: DISCOUNTS,
    });

    expect(result).toEqual({ ok: false, code: 'INTERNAL' });
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});
