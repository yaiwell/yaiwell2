import { describe, expect, it } from 'vitest';

import { isCancelledSlotReleasable, type ReleasableInput } from './panel-releasable';

/**
 * Cuándo ofrece el panel «Liberar con descuento» sobre una reserva
 * cancelada, la cancelara el centro o el cliente (§4.bis, caso a).
 */

const NOW = new Date('2026-10-05T10:00:00.000Z');
const HOUR = 60 * 60_000;

function input(overrides: Partial<ReleasableInput> = {}): ReleasableInput {
  return {
    status: 'cancelled',
    startAt: new Date(NOW.getTime() + 5 * HOUR),
    releasedAs: null,
    slotOffer: null,
    ...overrides,
  };
}

describe('isCancelledSlotReleasable', () => {
  it('cancelada o reembolsada con margen y sin oferta: se ofrece', () => {
    expect(isCancelledSlotReleasable(input(), NOW)).toBe(true);
    expect(isCancelledSlotReleasable(input({ status: 'refunded' }), NOW)).toBe(true);
  });

  it.each(['pending', 'confirmed', 'completed'] as const)('%s: no', (status) => {
    expect(isCancelledSlotReleasable(input({ status }), NOW)).toBe(false);
  });

  it('a 30 min justos todavía; a 29 ya no (antelación mínima)', () => {
    expect(
      isCancelledSlotReleasable(input({ startAt: new Date(NOW.getTime() + 30 * 60_000) }), NOW),
    ).toBe(true);
    expect(
      isCancelledSlotReleasable(input({ startAt: new Date(NOW.getTime() + 29 * 60_000) }), NOW),
    ).toBe(false);
  });

  it('no si ya se liberó desde esta reserva', () => {
    expect(isCancelledSlotReleasable(input({ releasedAs: { id: 'o-1' } }), NOW)).toBe(false);
  });

  it('no si se vendió con una oferta que sigue activa (vuelve a anunciarse sola)', () => {
    expect(isCancelledSlotReleasable(input({ slotOffer: { status: 'active' } }), NOW)).toBe(false);
  });

  it('sí si la oferta de origen se retiró (cancelación del centro)', () => {
    expect(isCancelledSlotReleasable(input({ slotOffer: { status: 'withdrawn' } }), NOW)).toBe(
      true,
    );
  });
});
