import { describe, expect, it } from 'vitest';

import { resolveDisplayedPrice } from './BookingFlow.price';
import type { CheckoutState } from './BookingFlow.types';

/**
 * Tests de qué importe enseña el flujo: el del servidor en cuanto hay
 * reserva; antes, el previsto del hueco elegido o el de catálogo.
 */

const OFFER = { discountPct: 20, priceCents: 3600, originalPriceCents: 4500 };

const READY: Extract<CheckoutState, { status: 'ready' }> = {
  status: 'ready',
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
