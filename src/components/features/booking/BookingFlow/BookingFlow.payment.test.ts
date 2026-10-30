import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createOnsiteBookingAction,
  getPaymentOptionsAction,
} from '@/app/[locale]/centro/[slugWithId]/reservar/onsite-actions';

import { releaseWasAttempted, useOnsiteBooking } from './BookingFlow.onsite';
import {
  pendingToReplace,
  resolveConfirmation,
  useBookingFlowPayment,
  withOnsiteLastMinute,
} from './BookingFlow.payment';
import { resolveEffectivePaymentMethod, usePaymentOptions } from './BookingFlow.paymentOptions';
import type { BookingDraft } from './BookingFlow.types';

/**
 * Tests de la elección del método de pago y de la reserva en el local
 * dentro del flujo (§4.bis): el flujo nunca reserva en el local si el
 * servidor no lo ofrece, una respuesta tardía no pisa otro hueco, y la
 * `pending` del checkout online se sustituye en vez de duplicarse.
 */

vi.mock('@/app/[locale]/centro/[slugWithId]/reservar/onsite-actions', () => ({
  createOnsiteBookingAction: vi.fn(),
  getPaymentOptionsAction: vi.fn(),
}));

const mockedCreate = vi.mocked(createOnsiteBookingAction);
const mockedOptions = vi.mocked(getPaymentOptionsAction);

const SLOT_A = '2026-11-10T17:30:00.000Z';
const SLOT_B = '2026-11-10T18:30:00.000Z';
const AVAILABLE = {
  online: 'available' as const,
  onsite: 'available' as const,
  restrictedUntilIso: null,
};

const DRAFT: BookingDraft = {
  slotStartIso: SLOT_A,
  slotEndIso: SLOT_B,
  notes: '',
  bookingId: null,
  paymentMethod: 'onsite',
};

const PRICE = { amountCents: 4500, originalPriceCents: null, discountPct: null, isEstimate: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveEffectivePaymentMethod', () => {
  it('solo es en el local si el servidor lo ofrece para el hueco', () => {
    const ready = { status: 'ready' as const, options: AVAILABLE };
    expect(resolveEffectivePaymentMethod('onsite', ready)).toBe('onsite');
    expect(
      resolveEffectivePaymentMethod('onsite', {
        status: 'ready',
        options: { ...AVAILABLE, onsite: 'last_minute' },
      }),
    ).toBe('online');
    expect(resolveEffectivePaymentMethod('onsite', { status: 'loading' })).toBe('online');
    expect(resolveEffectivePaymentMethod('onsite', { status: 'unavailable' })).toBe('online');
    expect(resolveEffectivePaymentMethod('online', ready)).toBe('online');
  });
});

describe('usePaymentOptions', () => {
  it('consulta el hueco y pasa de «cargando» a listo', async () => {
    mockedOptions.mockResolvedValue({ ok: true, options: AVAILABLE });
    const { result } = renderHook(() => usePaymentOptions('svc-1', SLOT_A));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', options: AVAILABLE }));
    expect(mockedOptions).toHaveBeenCalledWith({ serviceId: 'svc-1', slotStartIso: SLOT_A });
  });

  it('sin hueco no consulta', () => {
    const { result } = renderHook(() => usePaymentOptions('svc-1', null));
    expect(result.current.status).toBe('idle');
    expect(mockedOptions).not.toHaveBeenCalled();
  });

  it('una respuesta tardía del hueco anterior no pisa la del nuevo', async () => {
    let resolveA: (value: Awaited<ReturnType<typeof getPaymentOptionsAction>>) => void = () => {};
    mockedOptions
      .mockImplementationOnce(() => new Promise((resolve) => (resolveA = resolve)))
      .mockResolvedValueOnce({ ok: false });
    const { result, rerender } = renderHook(({ slot }) => usePaymentOptions('svc-1', slot), {
      initialProps: { slot: SLOT_A },
    });

    rerender({ slot: SLOT_B });
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    await act(async () => resolveA({ ok: true, options: AVAILABLE }));
    expect(result.current.status).toBe('unavailable');
  });
});

describe('pendingToReplace y resolveConfirmation', () => {
  it('sustituye la pending del checkout online abierto', () => {
    const ready = {
      status: 'ready' as const,
      bookingId: 'bk-pending',
      clientSecret: 's',
      amountCents: 4500,
      originalPriceCents: null,
      discountPct: null,
      isLastMinute: false,
      estimatedLastMinute: false,
      slotStartIso: SLOT_A,
    };
    expect(pendingToReplace(ready, DRAFT)).toBe('bk-pending');
    expect(pendingToReplace({ status: 'idle' }, DRAFT)).toBeNull();
  });

  it('en el local confirma con los datos de la reserva creada, sin «pago en curso»', () => {
    const details = resolveConfirmation(
      {
        status: 'done',
        booking: {
          ok: true,
          bookingId: 'bk-onsite',
          amountCents: 3600,
          originalPriceCents: 4500,
          discountPct: 20,
          slotStartIso: SLOT_A,
          slotEndIso: SLOT_B,
        },
      },
      DRAFT,
      PRICE,
      true,
    );
    expect(details).toMatchObject({
      bookingId: 'bk-onsite',
      amountCents: 3600,
      paymentMode: 'onsite',
      paymentPending: false,
    });
  });

  it('online sin reserva todavía no hay confirmación que enseñar', () => {
    expect(resolveConfirmation({ status: 'idle' }, DRAFT, PRICE, false)).toBeNull();
  });
});

describe('useOnsiteBooking', () => {
  const REQUEST = {
    serviceId: 'svc-1',
    slotStartIso: SLOT_A,
    notes: '  ',
    replacesPendingBookingId: null,
  };

  it('crea la reserva una sola vez aunque se pulse dos veces', async () => {
    const created = {
      ok: true as const,
      bookingId: 'bk-1',
      amountCents: 4500,
      originalPriceCents: null,
      discountPct: null,
      slotStartIso: SLOT_A,
      slotEndIso: SLOT_B,
    };
    mockedCreate.mockResolvedValue(created);
    const onCreated = vi.fn();
    const { result } = renderHook(() =>
      useOnsiteBooking({ onCreated, onPendingReleased: vi.fn() }),
    );

    await act(async () => {
      void result.current.confirm(REQUEST);
      await result.current.confirm(REQUEST);
    });

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    // Notas en blanco no viajan.
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ notes: undefined }));
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current.state).toEqual({ status: 'done', booking: created });
  });

  it('si falló tras soltar la pending, avisa para descartar el checkout online', async () => {
    mockedCreate.mockResolvedValue({ ok: false, code: 'SLOT_UNAVAILABLE' });
    const onPendingReleased = vi.fn();
    const { result } = renderHook(() =>
      useOnsiteBooking({ onCreated: vi.fn(), onPendingReleased }),
    );

    await act(() => result.current.confirm({ ...REQUEST, replacesPendingBookingId: 'bk-p' }));

    expect(onPendingReleased).toHaveBeenCalled();
    expect(result.current.state).toEqual({
      status: 'error',
      error: { ok: false, code: 'SLOT_UNAVAILABLE' },
    });
  });

  it('releaseWasAttempted: sin sesión o con la pending ya pagada no se soltó nada', () => {
    expect(releaseWasAttempted({ ok: false, code: 'UNAUTHENTICATED' })).toBe(false);
    expect(releaseWasAttempted({ ok: false, code: 'PENDING_ALREADY_PAID' })).toBe(false);
    expect(releaseWasAttempted({ ok: false, code: 'ONSITE_NOT_ALLOWED' })).toBe(true);
  });
});

describe('confirmar en el local con el plazo ya vencido', () => {
  it('a 1h59 al pulsar Confirmar: no llama al servidor y vuelve al resumen con online', async () => {
    mockedOptions.mockResolvedValue({ ok: true, options: AVAILABLE });
    const slot = new Date(Date.now() + 119 * 60 * 1000).toISOString();
    const deps = {
      serviceId: 'svc-1',
      step: 'payment',
      draft: { ...DRAFT, slotStartIso: slot },
      checkout: { status: 'idle' as const },
      updateDraft: vi.fn(),
      goBack: vi.fn(),
      chooseAnotherSlot: vi.fn(),
      completePayment: vi.fn(),
      discardCheckout: vi.fn(),
    };
    const { result, rerender } = renderHook((props) => useBookingFlowPayment(props), {
      initialProps: deps,
    });

    act(() => result.current.confirmOnsite());

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(deps.updateDraft).toHaveBeenCalledWith({ paymentMethod: 'online' });
    expect(deps.goBack).toHaveBeenCalled();

    // Ya en el resumen: aviso visible y el local desactivado por última hora.
    rerender({ ...deps, step: 'summary' });
    await waitFor(() => expect(result.current.paymentOptions.status).toBe('ready'));
    expect(result.current.onsiteLeadTimeExpired).toBe(true);
    expect(result.current.paymentOptions).toMatchObject({ options: { onsite: 'last_minute' } });
  });

  it('withOnsiteLastMinute no inventa el local si el negocio no lo ofrece', () => {
    const notOffered = {
      status: 'ready' as const,
      options: { ...AVAILABLE, onsite: 'not_offered' as const },
    };
    expect(withOnsiteLastMinute(notOffered)).toBe(notOffered);
    expect(withOnsiteLastMinute({ status: 'loading' })).toEqual({ status: 'loading' });
  });
});
