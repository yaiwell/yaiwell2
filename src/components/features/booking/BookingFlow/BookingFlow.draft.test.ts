import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BOOKING_DRAFT_STORAGE_KEY,
  clearBookingDraft,
  loadBookingDraft,
  restoreBookingDraft,
  saveBookingDraft,
} from './BookingFlow.draft';

/**
 * Tests de la persistencia del borrador de reserva.
 *
 * El caso de negocio: el anónimo elige hueco, escribe notas y sólo en el
 * paso de pago descubre que necesita cuenta. Al volver de `/entrar` el
 * borrador debe seguir ahí — salvo el hueco, si mientras tanto ha
 * caducado.
 */

const SERVICE_ID = 'svc-1';
const NOW = new Date('2026-10-05T10:00:00.000Z');
/** Hueco cómodamente por encima de la antelación mínima de 2 h. */
const FUTURE_START = '2026-10-05T18:00:00.000Z';
const FUTURE_END = '2026-10-05T19:00:00.000Z';

function writeRaw(value: unknown) {
  window.sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify(value));
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('saveBookingDraft / loadBookingDraft', () => {
  it('persiste hueco y notas con debounce', () => {
    saveBookingDraft(SERVICE_ID, {
      slotStartIso: FUTURE_START,
      slotEndIso: FUTURE_END,
      notes: 'Primera vez',
      bookingId: 'bk-1',
    });

    // Antes del debounce todavía no hay nada escrito.
    expect(window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)).toBeNull();
    vi.advanceTimersByTime(300);

    expect(loadBookingDraft(SERVICE_ID)).toEqual({
      serviceId: SERVICE_ID,
      slotStartIso: FUTURE_START,
      slotEndIso: FUTURE_END,
      notes: 'Primera vez',
    });
  });

  it('nunca persiste el bookingId', () => {
    // Es estado de servidor y pertenece a un cliente concreto:
    // restaurarlo tras autenticarse con otra cuenta apuntaría a una
    // reserva ajena.
    saveBookingDraft(SERVICE_ID, {
      slotStartIso: FUTURE_START,
      slotEndIso: FUTURE_END,
      notes: '',
      bookingId: 'bk-de-otro',
    });
    vi.advanceTimersByTime(300);

    const raw = window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('bk-de-otro');
    expect(raw).not.toContain('bookingId');
  });

  it('descarta el borrador de otro servicio', () => {
    writeRaw({ serviceId: 'otro-servicio', slotStartIso: FUTURE_START, notes: 'x' });
    expect(loadBookingDraft(SERVICE_ID)).toBeNull();
  });

  it('trata un JSON corrupto como ausencia de borrador', () => {
    window.sessionStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, '{no json');
    expect(loadBookingDraft(SERVICE_ID)).toBeNull();
  });

  it('clearBookingDraft cancela la escritura pendiente', () => {
    saveBookingDraft(SERVICE_ID, {
      slotStartIso: FUTURE_START,
      slotEndIso: FUTURE_END,
      notes: 'x',
      bookingId: null,
    });
    clearBookingDraft();
    vi.advanceTimersByTime(300);

    expect(window.sessionStorage.getItem(BOOKING_DRAFT_STORAGE_KEY)).toBeNull();
  });
});

describe('restoreBookingDraft', () => {
  it('devuelve el borrador intacto si el hueco sigue siendo reservable', () => {
    writeRaw({
      serviceId: SERVICE_ID,
      slotStartIso: FUTURE_START,
      slotEndIso: FUTURE_END,
      notes: 'Vengo con mi hija',
    });

    expect(restoreBookingDraft(SERVICE_ID, NOW)).toEqual({
      draft: {
        slotStartIso: FUTURE_START,
        slotEndIso: FUTURE_END,
        notes: 'Vengo con mi hija',
        bookingId: null,
      },
      slotExpired: false,
    });
  });

  it('descarta el hueco caducado pero conserva las notas', () => {
    // El usuario se fue a registrarse y volvió cuando faltaba menos de
    // la antelación mínima: ese hueco ya no se puede reservar, pero lo
    // que escribió sigue valiendo.
    writeRaw({
      serviceId: SERVICE_ID,
      slotStartIso: '2026-10-05T10:30:00.000Z',
      slotEndIso: '2026-10-05T11:30:00.000Z',
      notes: 'Alérgica al amoníaco',
    });

    expect(restoreBookingDraft(SERVICE_ID, NOW)).toEqual({
      draft: {
        slotStartIso: null,
        slotEndIso: null,
        notes: 'Alérgica al amoníaco',
        bookingId: null,
      },
      slotExpired: true,
    });
  });

  it('no marca nada como caducado si el borrador no tenía hueco', () => {
    writeRaw({ serviceId: SERVICE_ID, slotStartIso: null, slotEndIso: null, notes: 'Sólo notas' });

    const restored = restoreBookingDraft(SERVICE_ID, NOW);
    expect(restored?.slotExpired).toBe(false);
    expect(restored?.draft.notes).toBe('Sólo notas');
  });

  it('devuelve null si no hay nada guardado', () => {
    expect(restoreBookingDraft(SERVICE_ID, NOW)).toBeNull();
  });
});
