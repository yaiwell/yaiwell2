import { describe, expect, it } from 'vitest';

import {
  applyDiscountCents,
  areValidSlotOfferDiscounts,
  computeCommissionCents,
  getCurrentDiscountPct,
  getSlotOfferExpiresAt,
  getSlotOfferTier,
  priceSlot,
} from './slot-offer-pricing';

const START = new Date('2026-10-28T17:00:00.000Z');
const minutesBefore = (min: number) => new Date(START.getTime() - min * 60_000);
const discounts = { over2h: 10, oneToTwoHours: 20, underOneHour: 30 };

describe('getSlotOfferTier', () => {
  it('reparte en tramos con los bordes inclusivos hacia el tramo lejano', () => {
    expect(getSlotOfferTier(START, minutesBefore(121))).toBe('over2h');
    expect(getSlotOfferTier(START, minutesBefore(120))).toBe('over2h');
    expect(getSlotOfferTier(START, minutesBefore(119))).toBe('oneToTwoHours');
    expect(getSlotOfferTier(START, minutesBefore(60))).toBe('oneToTwoHours');
    expect(getSlotOfferTier(START, minutesBefore(59))).toBe('underOneHour');
    expect(getSlotOfferTier(START, minutesBefore(30))).toBe('underOneHour');
  });
});

describe('getCurrentDiscountPct', () => {
  it('el descuento sube al acercarse la hora', () => {
    expect(getCurrentDiscountPct(discounts, START, minutesBefore(180))).toBe(10);
    expect(getCurrentDiscountPct(discounts, START, minutesBefore(90))).toBe(20);
    expect(getCurrentDiscountPct(discounts, START, minutesBefore(45))).toBe(30);
  });
});

describe('applyDiscountCents y computeCommissionCents', () => {
  it('redondea el precio al céntimo y la comisión hacia abajo sobre lo cobrado', () => {
    expect(applyDiscountCents(4500, 20)).toBe(3600);
    expect(applyDiscountCents(1999, 15)).toBe(1699); // 1699,15 → 1699
    expect(applyDiscountCents(4500, 0)).toBe(4500);
    expect(computeCommissionCents(3600, 800)).toBe(288);
    expect(computeCommissionCents(1699, 800)).toBe(135); // 135,92 → 135
  });
});

describe('areValidSlotOfferDiscounts', () => {
  it('acepta tramos crecientes en pasos de 5 hasta el 50 %', () => {
    expect(areValidSlotOfferDiscounts(discounts)).toBe(true);
    expect(areValidSlotOfferDiscounts({ over2h: 0, oneToTwoHours: 0, underOneHour: 5 })).toBe(true);
    expect(areValidSlotOfferDiscounts({ over2h: 50, oneToTwoHours: 50, underOneHour: 50 })).toBe(
      true,
    );
  });

  it('rechaza pasos raros, el tope, un tramo cercano menor y una oferta sin descuento', () => {
    expect(areValidSlotOfferDiscounts({ over2h: 12, oneToTwoHours: 20, underOneHour: 30 })).toBe(
      false,
    );
    expect(areValidSlotOfferDiscounts({ over2h: 10, oneToTwoHours: 20, underOneHour: 55 })).toBe(
      false,
    );
    expect(areValidSlotOfferDiscounts({ over2h: 30, oneToTwoHours: 20, underOneHour: 40 })).toBe(
      false,
    );
    expect(areValidSlotOfferDiscounts({ over2h: 0, oneToTwoHours: 0, underOneHour: 0 })).toBe(
      false,
    );
    expect(areValidSlotOfferDiscounts({ over2h: -5, oneToTwoHours: 0, underOneHour: 5 })).toBe(
      false,
    );
  });
});

describe('getSlotOfferExpiresAt', () => {
  it('caduca a los 30 min del inicio, como cualquier reserva', () => {
    expect(getSlotOfferExpiresAt(START).toISOString()).toBe('2026-10-28T16:30:00.000Z');
  });
});

describe('priceSlot', () => {
  it('sin oferta o con el tramo vigente a 0 % cobra el precio normal sin «antes»', () => {
    expect(priceSlot(4500, null, START, minutesBefore(45))).toEqual({
      priceCents: 4500,
      discountPct: null,
      originalPriceCents: null,
    });
    expect(
      priceSlot(4500, { over2h: 0, oneToTwoHours: 0, underOneHour: 20 }, START, minutesBefore(90)),
    ).toEqual({ priceCents: 4500, discountPct: null, originalPriceCents: null });
  });

  it('con oferta aplica el % del tramo vigente y guarda el precio de referencia', () => {
    expect(priceSlot(4500, discounts, START, minutesBefore(45))).toEqual({
      priceCents: 3150,
      discountPct: 30,
      originalPriceCents: 4500,
    });
  });
});
