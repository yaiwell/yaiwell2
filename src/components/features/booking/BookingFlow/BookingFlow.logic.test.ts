import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBookingCheckoutAction } from '@/app/[locale]/centro/[slugWithId]/reservar/actions';

import { BOOKING_STEPS, useBookingFlow } from './BookingFlow.logic';

/**
 * Tests del hook `useBookingFlow`.
 *
 * Además de la navegación entre pasos, cubren el contrato con el
 * checkout: la reserva se crea **una sola vez** al pasar a pago, se
 * invalida si el usuario cambia de hueco, y los errores de la server
 * action quedan expuestos como estado para que la UI los traduzca.
 */

vi.mock('@/app/[locale]/centro/[slugWithId]/reservar/actions', () => ({
  createBookingCheckoutAction: vi.fn(),
}));

const mockedAction = vi.mocked(createBookingCheckoutAction);

const SLOT_START = '2026-05-30T10:00:00.000Z';
const SLOT_END = '2026-05-30T11:00:00.000Z';

const OK_RESULT = {
  ok: true as const,
  bookingId: 'bk-123',
  clientSecret: 'pi_123_secret_abc',
  amountCents: 4500,
  slotStartIso: SLOT_START,
  slotEndIso: SLOT_END,
};

function renderFlow() {
  return renderHook(() => useBookingFlow({ serviceId: 'svc-1' }));
}

/** Selecciona un slot y avanza hasta el paso de pago. */
async function advanceToPayment(result: { current: ReturnType<typeof useBookingFlow> }) {
  act(() => {
    result.current.selectSlot(SLOT_START, SLOT_END);
  });
  act(() => {
    result.current.goNext();
  });
  await act(async () => {
    result.current.goNext();
  });
}

beforeEach(() => {
  mockedAction.mockReset();
  mockedAction.mockResolvedValue(OK_RESULT);
});

describe('useBookingFlow', () => {
  it('arranca en el paso "slot" con draft vacío y sin avance disponible', () => {
    const { result } = renderFlow();

    expect(result.current.step).toBe('slot');
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.draft.slotStartIso).toBeNull();
    expect(result.current.draft.bookingId).toBeNull();
    expect(result.current.canAdvance).toBe(false);
    expect(result.current.checkout).toEqual({ status: 'idle' });
  });

  it('habilita el avance solo cuando se selecciona un slot', () => {
    const { result } = renderFlow();

    act(() => {
      result.current.selectSlot(SLOT_START, SLOT_END);
    });

    expect(result.current.draft.slotStartIso).toBe(SLOT_START);
    expect(result.current.draft.slotEndIso).toBe(SLOT_END);
    expect(result.current.canAdvance).toBe(true);
  });

  it('avanza y retrocede entre pasos respetando los límites del flujo', async () => {
    const { result } = renderFlow();

    await advanceToPayment(result);
    expect(result.current.step).toBe('payment');

    act(() => {
      result.current.goBack();
    });

    expect(result.current.step).toBe('summary');
  });

  it('no retrocede más allá del primer paso', () => {
    const { result } = renderFlow();

    // Doble goBack desde el paso inicial debería ser idempotente.
    act(() => {
      result.current.goBack();
      result.current.goBack();
    });

    expect(result.current.step).toBe('slot');
  });

  it('abre el checkout al pasar de resumen a pago y expone el clientSecret', async () => {
    const { result } = renderFlow();

    await advanceToPayment(result);

    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));
    expect(mockedAction).toHaveBeenCalledWith({
      serviceId: 'svc-1',
      slotStartIso: SLOT_START,
      notes: undefined,
    });
    expect(result.current.draft.bookingId).toBe('bk-123');
    expect(result.current.checkout).toEqual({
      status: 'ready',
      clientSecret: 'pi_123_secret_abc',
      amountCents: 4500,
    });
  });

  it('no crea una segunda reserva si el usuario vuelve al resumen y avanza otra vez', async () => {
    // Regresión crítica: una segunda reserva sobre el mismo hueco
    // chocaría con la primera por solapamiento y dejaría al usuario
    // atascado con un "slot no disponible" causado por él mismo.
    const { result } = renderFlow();

    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    act(() => {
      result.current.goBack();
    });
    await act(async () => {
      result.current.goNext();
    });

    expect(mockedAction).toHaveBeenCalledTimes(1);
    expect(result.current.step).toBe('payment');
  });

  it('invalida el checkout si el usuario cambia de hueco', async () => {
    const { result } = renderFlow();

    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    act(() => {
      result.current.selectSlot('2026-05-30T12:00:00.000Z', '2026-05-30T13:00:00.000Z');
    });

    expect(result.current.checkout).toEqual({ status: 'idle' });
    expect(result.current.draft.bookingId).toBeNull();
  });

  it('expone el código de error cuando la server action falla', async () => {
    mockedAction.mockResolvedValue({ ok: false, code: 'SLOT_UNAVAILABLE' });
    const { result } = renderFlow();

    await advanceToPayment(result);

    await waitFor(() =>
      expect(result.current.checkout).toEqual({ status: 'error', code: 'SLOT_UNAVAILABLE' }),
    );

    // Desde `error` el reintento sí debe volver a llamar a la action.
    mockedAction.mockResolvedValue(OK_RESULT);
    await act(async () => {
      result.current.retryCheckout();
    });
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));
    expect(mockedAction).toHaveBeenCalledTimes(2);
  });

  it('completePayment salta a la confirmación sin tocar el estado de la reserva', async () => {
    const { result } = renderFlow();

    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    act(() => {
      result.current.completePayment();
    });

    expect(result.current.step).toBe('confirmation');
    expect(result.current.draft.bookingId).toBe('bk-123');
  });

  it('updateDraft permite escribir notas sin tocar el resto del draft', () => {
    const { result } = renderFlow();

    act(() => {
      result.current.selectSlot(SLOT_START, SLOT_END);
      result.current.updateDraft({ notes: 'Vengo 5 minutos antes' });
    });

    expect(result.current.draft.notes).toBe('Vengo 5 minutos antes');
    expect(result.current.draft.slotStartIso).toBe(SLOT_START);
  });

  it('expone los pasos en el orden esperado del flujo', () => {
    // Regresión: si alguien reordena BOOKING_STEPS se rompe el indicador
    // visual del stepper y la lógica `goNext`/`goBack`.
    expect(BOOKING_STEPS).toEqual(['slot', 'summary', 'payment', 'confirmation']);
  });
});
