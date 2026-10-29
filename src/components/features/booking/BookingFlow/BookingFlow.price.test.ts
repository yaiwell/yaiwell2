import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { resolveDiscountChange, resolveDisplayedPrice, useBookingPrice } from './BookingFlow.price';
import type { CheckoutState } from './BookingFlow.types';

/**
 * Tests de qué importe enseña el flujo: el del servidor en cuanto hay
 * reserva; antes, el previsto del hueco elegido o el de catálogo.
 */

const OFFER = { discountPct: 20, priceCents: 3600, originalPriceCents: 4500 };

const READY: Extract<CheckoutState, { status: 'ready' }> = {
  status: 'ready',
  bookingId: 'bk-1',
  clientSecret: 'pi_secret',
  // El tramo cambió entre elegir y reservar: el servidor cobra un 30 %.
  amountCents: 3150,
  originalPriceCents: 4500,
  discountPct: 30,
  isLastMinute: true,
  estimatedLastMinute: true,
  slotStartIso: '2026-10-28T16:00:00.000Z',
};

describe('resolveDisplayedPrice', () => {
  it('sin reserva ni oferta enseña el precio de catálogo como previsión', () => {
    expect(resolveDisplayedPrice({ status: 'idle' }, 4500, null)).toEqual({
      amountCents: 4500,
      originalPriceCents: null,
      discountPct: null,
      isEstimate: true,
    });
  });

  it('sin reserva y con oferta enseña el precio del hueco como previsión', () => {
    expect(resolveDisplayedPrice({ status: 'idle' }, 4500, OFFER)).toEqual({
      amountCents: 3600,
      originalPriceCents: 4500,
      discountPct: 20,
      isEstimate: true,
    });
  });

  it('con reserva manda el servidor aunque el hueco dijese otra cosa', () => {
    expect(resolveDisplayedPrice(READY, 4500, OFFER)).toEqual({
      amountCents: 3150,
      originalPriceCents: 4500,
      discountPct: 30,
      isEstimate: false,
    });
  });

  it('con reserva sin descuento no inventa un tachado', () => {
    const ready = { ...READY, amountCents: 4500, originalPriceCents: null, discountPct: null };
    expect(resolveDisplayedPrice(ready, 4500, OFFER)).toMatchObject({
      amountCents: 4500,
      originalPriceCents: null,
      discountPct: null,
    });
  });
});

describe('resolveDiscountChange', () => {
  it('no dice nada sin oferta prevista o antes de tener reserva', () => {
    expect(resolveDiscountChange(null, READY)).toBeNull();
    expect(resolveDiscountChange(OFFER, { status: 'idle' })).toBeNull();
    expect(
      resolveDiscountChange(OFFER, { status: 'creating', estimatedLastMinute: false }),
    ).toBeNull();
  });

  it('avisa de descuento perdido si el servidor cobra sin descuento', () => {
    const ready = { ...READY, amountCents: 4500, originalPriceCents: null, discountPct: null };
    expect(resolveDiscountChange(OFFER, ready)).toEqual({ kind: 'lost', amountCents: 4500 });
  });

  it('avisa de descuento cambiado si el importe sube', () => {
    const ready = { ...READY, amountCents: 4050, discountPct: 10 };
    expect(resolveDiscountChange(OFFER, ready)).toEqual({
      kind: 'changed',
      amountCents: 4050,
      discountPct: 10,
    });
  });

  it('no avisa si el importe es igual o mejor que el previsto', () => {
    expect(
      resolveDiscountChange(OFFER, { ...READY, amountCents: 3600, discountPct: 20 }),
    ).toBeNull();
    // El tramo bajó a favor del cliente: el pago ya enseña la cifra buena.
    expect(resolveDiscountChange(OFFER, READY)).toBeNull();
  });
});

describe('useBookingPrice', () => {
  it('recuerda la oferta del hueco elegido y avisa si el servidor la pierde', () => {
    const start = READY.slotStartIso;
    const { result, rerender } = renderHook(
      ({ checkout }: { checkout: CheckoutState }) => useBookingPrice(checkout, 4500, start),
      { initialProps: { checkout: { status: 'idle' } as CheckoutState } },
    );
    act(() =>
      result.current.rememberSlot({
        startAtIso: start,
        endAtIso: start,
        available: true,
        offer: OFFER,
      }),
    );
    expect(result.current.discountChange).toBeNull();

    rerender({
      checkout: { ...READY, amountCents: 4500, originalPriceCents: null, discountPct: null },
    });
    expect(result.current.discountChange).toEqual({ kind: 'lost', amountCents: 4500 });
    expect(result.current.price).toMatchObject({ amountCents: 4500, isEstimate: false });
  });
});
