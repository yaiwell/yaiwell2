import { describe, expect, it } from 'vitest';

import { creatingCheckout, readyCheckout } from './BookingFlow.checkout';

/**
 * La estimación de "última hora" se congela al lanzar el checkout y el
 * estado `ready` guarda el inicio que devuelve el servidor.
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');

describe('creatingCheckout', () => {
  it('congela la estimación en el instante de lanzar', () => {
    expect(creatingCheckout('2026-10-05T12:10:00.000Z', NOW)).toEqual({
      status: 'creating',
      estimatedLastMinute: false,
    });
    expect(creatingCheckout('2026-10-05T11:30:00.000Z', NOW).estimatedLastMinute).toBe(true);
  });
});

describe('readyCheckout', () => {
  it('guarda el slotStartIso del servidor y la estimación congelada', () => {
    const state = readyCheckout(
      {
        ok: true,
        bookingId: 'bk-1',
        clientSecret: 'pi_secret',
        amountCents: 4500,
        originalPriceCents: null,
        discountPct: null,
        slotStartIso: '2026-10-05T12:15:00.000Z',
        slotEndIso: '2026-10-05T13:15:00.000Z',
        isLastMinute: false,
      },
      false,
    );
    expect(state).toEqual({
      status: 'ready',
      clientSecret: 'pi_secret',
      amountCents: 4500,
      originalPriceCents: null,
      discountPct: null,
      isLastMinute: false,
      estimatedLastMinute: false,
      slotStartIso: '2026-10-05T12:15:00.000Z',
    });
  });
});
