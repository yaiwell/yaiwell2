import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBookingCheckoutAction,
  getBookingStatusAction,
} from '@/app/[locale]/centro/[slugWithId]/reservar/actions';
import type { PublicProfessional } from '@/types/domain';

import { buildCheckoutInput } from './BookingFlow.checkout';
import { BOOKING_DRAFT_STORAGE_KEY, restoreBookingDraft } from './BookingFlow.draft';
import { useBookingFlow } from './BookingFlow.logic';
import { isProfessionalUnavailable, resolveShownProfessional } from './BookingFlow.professional';
import type { BookingDraft } from './BookingFlow.types';

/**
 * Tests del profesional dentro del flujo de reserva (CLAUDE.md §4.bis
 * «Equipo»): el checkout manda el elegido (o nada con «cualquiera»), el
 * borrador lo conserva solo si sigue prestando el servicio, cambiarlo
 * invalida el checkout abierto y la confirmación enseña el asignado.
 */

vi.mock('@/app/[locale]/centro/[slugWithId]/reservar/actions', () => ({
  createBookingCheckoutAction: vi.fn(),
  getBookingStatusAction: vi.fn(),
}));

const mockedAction = vi.mocked(createBookingCheckoutAction);

const SLOT_START = '2099-05-30T10:00:00.000Z';
const SLOT_END = '2099-05-30T11:00:00.000Z';

const OK_RESULT = {
  ok: true as const,
  bookingId: 'bk-1',
  clientSecret: 'pi_secret',
  amountCents: 4500,
  originalPriceCents: null,
  discountPct: null,
  slotStartIso: SLOT_START,
  slotEndIso: SLOT_END,
  isLastMinute: false,
  professionalId: 'pro-9',
};

const DRAFT: BookingDraft = {
  slotStartIso: SLOT_START,
  slotEndIso: SLOT_END,
  notes: '  ',
  bookingId: null,
  paymentMethod: 'online',
  professionalId: null,
};

const ANA: PublicProfessional = { id: 'pro-9', name: 'Ana', photo: null, bio: null };
const LAIA: PublicProfessional = { id: 'pro-2', name: 'Laia', photo: null, bio: null };

beforeEach(() => {
  window.sessionStorage.clear();
  mockedAction.mockReset();
  mockedAction.mockResolvedValue(OK_RESULT);
  vi.mocked(getBookingStatusAction).mockResolvedValue({
    ok: true,
    bookingId: 'bk-1',
    status: 'pending',
    isConfirmed: false,
  });
});

describe('buildCheckoutInput', () => {
  it('con «cualquiera» no manda professionalId', () => {
    expect(buildCheckoutInput('svc-1', DRAFT, SLOT_START)).toEqual({
      serviceId: 'svc-1',
      slotStartIso: SLOT_START,
      notes: undefined,
    });
  });

  it('con profesional elegido lo manda', () => {
    expect(
      buildCheckoutInput('svc-1', { ...DRAFT, professionalId: 'pro-2' }, SLOT_START),
    ).toMatchObject({ professionalId: 'pro-2' });
  });
});

describe('useBookingFlow — profesional', () => {
  function renderFlow() {
    return renderHook(() =>
      useBookingFlow({ serviceId: 'svc-1', professionalIds: ['pro-2', 'pro-9'] }),
    );
  }

  it('envía el profesional elegido al abrir el checkout', async () => {
    const { result } = renderFlow();

    act(() => result.current.selectProfessional('pro-2'));
    act(() => result.current.selectSlot(SLOT_START, SLOT_END));
    act(() => result.current.goNext());
    act(() => result.current.goNext());

    await waitFor(() => expect(mockedAction).toHaveBeenCalledTimes(1));
    expect(mockedAction).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: 'svc-1', professionalId: 'pro-2' }),
    );
  });

  it('cambiar de profesional invalida el checkout abierto', async () => {
    const { result } = renderFlow();

    act(() => result.current.selectSlot(SLOT_START, SLOT_END));
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    await waitFor(() => expect(result.current.checkout.status).toBe('ready'));

    act(() => result.current.selectProfessional('pro-2'));

    expect(result.current.checkout).toEqual({ status: 'idle' });
    expect(result.current.draft).toMatchObject({ professionalId: 'pro-2', bookingId: null });
    // La hora se conserva: si no está en la nueva agenda, la suelta el SlotPicker.
    expect(result.current.draft.slotStartIso).toBe(SLOT_START);
  });

  it('clearSlot suelta la hora y conserva el profesional', () => {
    const { result } = renderFlow();
    act(() => result.current.selectProfessional('pro-2'));
    act(() => result.current.selectSlot(SLOT_START, SLOT_END));

    act(() => result.current.clearSlot());

    expect(result.current.draft).toMatchObject({
      slotStartIso: null,
      slotEndIso: null,
      professionalId: 'pro-2',
    });
  });

  it('chooseAnotherSlot(true) vuelve a «cualquiera» sin el aviso de hueco caducado', () => {
    const { result } = renderFlow();
    act(() => result.current.selectProfessional('pro-2'));
    act(() => result.current.selectSlot(SLOT_START, SLOT_END));

    act(() => result.current.chooseAnotherSlot(true));

    expect(result.current.draft.professionalId).toBeNull();
    expect(result.current.slotExpired).toBe(false);
    expect(result.current.step).toBe('slot');
  });
});

describe('restoreBookingDraft — profesional', () => {
  const NOW = new Date('2099-05-29T10:00:00.000Z');

  function writeDraft(professionalId: unknown) {
    window.sessionStorage.setItem(
      BOOKING_DRAFT_STORAGE_KEY,
      JSON.stringify({ serviceId: 'svc-1', slotStartIso: null, notes: '', professionalId }),
    );
  }

  it('conserva el profesional si sigue prestando el servicio', () => {
    writeDraft('pro-2');
    expect(restoreBookingDraft('svc-1', NOW, ['pro-2'])?.draft.professionalId).toBe('pro-2');
  });

  it('vuelve a «cualquiera» si ya no lo presta o el valor no es válido', () => {
    writeDraft('pro-baja');
    expect(restoreBookingDraft('svc-1', NOW, ['pro-2'])?.draft.professionalId).toBeNull();
    writeDraft(42);
    expect(restoreBookingDraft('svc-1', NOW, ['pro-2'])?.draft.professionalId).toBeNull();
  });
});

describe('resolveShownProfessional / isProfessionalUnavailable', () => {
  const professionals = [LAIA, ANA];

  it('la confirmación enseña el asignado por el servidor con «cualquiera»', () => {
    const shown = resolveShownProfessional({
      onsite: { status: 'idle' },
      checkout: {
        status: 'ready',
        bookingId: 'bk-1',
        clientSecret: 's',
        amountCents: 1,
        originalPriceCents: null,
        discountPct: null,
        isLastMinute: false,
        estimatedLastMinute: false,
        slotStartIso: SLOT_START,
        professionalId: 'pro-9',
      },
      chosenId: null,
      professionals,
    });
    expect(shown).toBe(ANA);
  });

  it('en el local manda la reserva creada; sin dato, el elegido; si no, nada', () => {
    const done = {
      status: 'done' as const,
      booking: { ...OK_RESULT, professionalId: 'pro-2' },
    };
    expect(
      resolveShownProfessional({
        onsite: done,
        checkout: { status: 'idle' },
        chosenId: null,
        professionals,
      }),
    ).toBe(LAIA);
    expect(
      resolveShownProfessional({
        onsite: { status: 'idle' },
        checkout: { status: 'idle' },
        chosenId: 'pro-9',
        professionals,
      }),
    ).toBe(ANA);
    expect(
      resolveShownProfessional({
        onsite: { status: 'idle' },
        checkout: { status: 'idle' },
        chosenId: null,
        professionals,
      }),
    ).toBeNull();
  });

  it('detecta el fallo de profesional en online y en el local', () => {
    expect(
      isProfessionalUnavailable(
        { status: 'error', code: 'PROFESSIONAL_UNAVAILABLE' },
        {
          status: 'idle',
        },
      ),
    ).toBe(true);
    expect(
      isProfessionalUnavailable(
        { status: 'idle' },
        { status: 'error', error: { ok: false, code: 'PROFESSIONAL_UNAVAILABLE' } },
      ),
    ).toBe(true);
    expect(
      isProfessionalUnavailable({ status: 'error', code: 'SLOT_UNAVAILABLE' }, { status: 'idle' }),
    ).toBe(false);
  });
});
