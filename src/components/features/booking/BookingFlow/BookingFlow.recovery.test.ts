import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBookingCheckoutAction,
  getBookingStatusAction,
} from '@/app/[locale]/centro/[slugWithId]/reservar/actions';

import { BOOKING_DRAFT_STORAGE_KEY } from './BookingFlow.draft';
import { useBookingFlow } from './BookingFlow.logic';

/**
 * Tests de los dos agujeros de embudo del flujo de reserva.
 *
 *  1. **Estado real del pago.** El camino sin 3DS —el mayoritario—
 *     resolvía `confirmPayment` sin salir de la página y pintaba
 *     "¡Reserva confirmada!" antes de que el webhook
 *     `payment_intent.succeeded` hubiera movido nada. Aquí se fija que
 *     mientras BD diga `pending`, la UI no anuncia confirmación.
 *  2. **El anónimo que se va y vuelve.** Elegía hueco, escribía notas y
 *     descubría en el paso 3 que necesitaba cuenta. Al volver el
 *     borrador estaba vacío. Aquí se fija que se recupera, y qué pasa
 *     si el hueco ha caducado mientras tanto.
 */

vi.mock('@/app/[locale]/centro/[slugWithId]/reservar/actions', () => ({
  createBookingCheckoutAction: vi.fn(),
  getBookingStatusAction: vi.fn(),
}));

const mockedCheckout = vi.mocked(createBookingCheckoutAction);
const mockedStatus = vi.mocked(getBookingStatusAction);

const SERVICE_ID = 'svc-1';
/** Hueco lo bastante lejano como para seguir siendo reservable siempre. */
const FUTURE_START = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const FUTURE_END = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();

const OK_CHECKOUT = {
  ok: true as const,
  bookingId: 'bk-123',
  clientSecret: 'pi_123_secret_abc',
  amountCents: 4500,
  slotStartIso: FUTURE_START,
  slotEndIso: FUTURE_END,
};

function renderFlow() {
  return renderHook(() => useBookingFlow({ serviceId: SERVICE_ID }));
}

/** Deja un borrador en `sessionStorage`, como lo dejaría el flujo real. */
function seedDraft(draft: {
  slotStartIso: string | null;
  slotEndIso: string | null;
  notes: string;
}) {
  window.sessionStorage.setItem(
    BOOKING_DRAFT_STORAGE_KEY,
    JSON.stringify({ serviceId: SERVICE_ID, ...draft }),
  );
}

/** Selecciona hueco y avanza hasta el paso de pago. */
async function advanceToPayment(result: { current: ReturnType<typeof useBookingFlow> }) {
  act(() => {
    result.current.selectSlot(FUTURE_START, FUTURE_END);
  });
  act(() => {
    result.current.goNext();
  });
  await act(async () => {
    result.current.goNext();
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  mockedCheckout.mockReset();
  mockedCheckout.mockResolvedValue(OK_CHECKOUT);
  mockedStatus.mockReset();
  mockedStatus.mockResolvedValue({
    ok: true,
    bookingId: 'bk-123',
    status: 'pending',
    isConfirmed: false,
  });
});

describe('estado real del pago en el camino sin 3DS', () => {
  it('NO anuncia la reserva como confirmada mientras BD la tiene en pending', async () => {
    const { result } = renderFlow();
    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    // Esto es lo que dispara `confirmPayment` al resolverse sin 3DS.
    await act(async () => {
      result.current.completePayment();
    });

    expect(result.current.step).toBe('confirmation');
    await waitFor(() => expect(mockedStatus).toHaveBeenCalledWith({ bookingId: 'bk-123' }));
    // El copy honesto: pago en curso, no "¡Reserva confirmada!".
    expect(result.current.paymentPending).toBe(true);
  });

  it('pasa a confirmada en cuanto BD lo dice', async () => {
    const { result } = renderFlow();
    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    mockedStatus.mockResolvedValue({
      ok: true,
      bookingId: 'bk-123',
      status: 'confirmed',
      isConfirmed: true,
    });

    await act(async () => {
      result.current.completePayment();
    });

    await waitFor(() => expect(result.current.paymentPending).toBe(false));
  });

  it('mantiene el copy honesto si la consulta de estado falla', async () => {
    // Un fallo de red no puede convertirse en una confirmación falsa.
    mockedStatus.mockResolvedValue({ ok: false, code: 'INTERNAL' });
    const { result } = renderFlow();
    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    await act(async () => {
      result.current.completePayment();
    });

    await waitFor(() => expect(mockedStatus).toHaveBeenCalled());
    expect(result.current.paymentPending).toBe(true);
  });

  it('no consulta el estado antes de llegar a la confirmación', async () => {
    const { result } = renderFlow();
    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    expect(mockedStatus).not.toHaveBeenCalled();
  });
});

describe('borrador del usuario anónimo que se va a autenticarse y vuelve', () => {
  it('recupera hueco y notas al volver', async () => {
    seedDraft({
      slotStartIso: FUTURE_START,
      slotEndIso: FUTURE_END,
      notes: 'Primera vez, soy alérgica al amoníaco',
    });

    const { result } = renderFlow();

    await waitFor(() => expect(result.current.draft.slotStartIso).toBe(FUTURE_START));
    expect(result.current.draft.slotEndIso).toBe(FUTURE_END);
    expect(result.current.draft.notes).toBe('Primera vez, soy alérgica al amoníaco');
    expect(result.current.slotExpired).toBe(false);
    // Puede continuar sin volver a tocar el calendario.
    expect(result.current.canAdvance).toBe(true);
  });

  it('descarta el hueco caducado, conserva las notas y lo avisa', async () => {
    // Entre que se fue a registrarse y volvió se agotó la antelación
    // mínima de 2 h para ese hueco.
    seedDraft({
      slotStartIso: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      slotEndIso: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      notes: 'Vengo con mi hija',
    });

    const { result } = renderFlow();

    await waitFor(() => expect(result.current.slotExpired).toBe(true));
    expect(result.current.draft.slotStartIso).toBeNull();
    expect(result.current.draft.notes).toBe('Vengo con mi hija');
    expect(result.current.step).toBe('slot');
    expect(result.current.canAdvance).toBe(false);
  });

  it('el aviso desaparece en cuanto elige otro hueco', async () => {
    seedDraft({
      slotStartIso: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      slotEndIso: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      notes: '',
    });
    const { result } = renderFlow();
    await waitFor(() => expect(result.current.slotExpired).toBe(true));

    act(() => {
      result.current.selectSlot(FUTURE_START, FUTURE_END);
    });

    expect(result.current.slotExpired).toBe(false);
  });

  it('ignora el borrador de otro servicio', async () => {
    window.sessionStorage.setItem(
      BOOKING_DRAFT_STORAGE_KEY,
      JSON.stringify({
        serviceId: 'otro-servicio',
        slotStartIso: FUTURE_START,
        slotEndIso: FUTURE_END,
        notes: 'De otra reserva',
      }),
    );

    const { result } = renderFlow();

    await waitFor(() => expect(result.current.step).toBe('slot'));
    expect(result.current.draft.slotStartIso).toBeNull();
    expect(result.current.draft.notes).toBe('');
  });

  it('tira el borrador al alcanzar la confirmación', async () => {
    const { result } = renderFlow();
    await advanceToPayment(result);
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    await act(async () => {
      result.current.completePayment();
    });

    expect(window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe('hueco que otro cliente se ha quedado', () => {
  it('chooseAnotherSlot devuelve al calendario con el hueco limpio', async () => {
    mockedCheckout.mockResolvedValue({ ok: false, code: 'SLOT_UNAVAILABLE' });
    const { result } = renderFlow();
    await advanceToPayment(result);
    await waitFor(() =>
      expect(result.current.checkout).toEqual({ status: 'error', code: 'SLOT_UNAVAILABLE' }),
    );

    act(() => {
      result.current.chooseAnotherSlot();
    });

    // Reintentar el mismo hueco fallaría siempre; la salida es elegir otro.
    expect(result.current.step).toBe('slot');
    expect(result.current.draft.slotStartIso).toBeNull();
    expect(result.current.draft.bookingId).toBeNull();
    expect(result.current.checkout).toEqual({ status: 'idle' });
    expect(result.current.slotExpired).toBe(true);
  });
});
