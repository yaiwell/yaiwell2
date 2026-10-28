import { MIN_BOOKING_LEAD_TIME_MS } from './booking-lead-time';
import { LAST_MINUTE_THRESHOLD_MS } from './booking-last-minute';

/**
 * Precio de los huecos liberados con descuento (CLAUDE.md §4.bis).
 *
 * El profesional fija un % por tramo de tiempo hasta el inicio y el
 * precio baja solo al acercarse la hora. Este módulo es puro y sin
 * dependencias de servidor: lo usan `createBooking` (que congela el
 * precio), el motor de disponibilidad y la UI para mostrar lo mismo.
 */

/** Tope de descuento de un hueco liberado. */
export const MAX_SLOT_OFFER_DISCOUNT_PCT = 50;

/** Paso entre porcentajes admitidos (5, 10, 15…). */
export const SLOT_OFFER_DISCOUNT_STEP_PCT = 5;

/**
 * Límites de los tramos: más de 2 h, de 1 a 2 h y menos de 1 h.
 *
 * La frontera de 2 h es la misma que separa las reservas de última hora
 * (sin reembolso): una sola constante para que nunca se desalineen.
 */
export const SLOT_OFFER_TIER_2H_MS = LAST_MINUTE_THRESHOLD_MS;
export const SLOT_OFFER_TIER_1H_MS = 60 * 60 * 1000;

/** Tramo de tiempo hasta el inicio del hueco. */
export type SlotOfferTier = 'over2h' | 'oneToTwoHours' | 'underOneHour';

/** % de descuento de cada tramo. */
export interface SlotOfferDiscounts {
  over2h: number;
  oneToTwoHours: number;
  underOneHour: number;
}

/** Tramo en el que cae un hueco que empieza en `startAt`, visto en `now`. */
export function getSlotOfferTier(startAt: Date, now: Date): SlotOfferTier {
  const remaining = startAt.getTime() - now.getTime();
  if (remaining >= SLOT_OFFER_TIER_2H_MS) return 'over2h';
  if (remaining >= SLOT_OFFER_TIER_1H_MS) return 'oneToTwoHours';
  return 'underOneHour';
}

/** % de descuento vigente de una oferta en `now`. */
export function getCurrentDiscountPct(
  discounts: SlotOfferDiscounts,
  startAt: Date,
  now: Date,
): number {
  return discounts[getSlotOfferTier(startAt, now)];
}

/**
 * Precio rebajado en céntimos, redondeado al céntimo.
 *
 * Partimos siempre del precio vigente del servicio: el «antes» que se
 * enseña nunca está inflado.
 */
export function applyDiscountCents(priceCents: number, discountPct: number): number {
  return Math.round((priceCents * (100 - discountPct)) / 100);
}

/**
 * Comisión de la plataforma en céntimos, redondeada hacia abajo.
 *
 * Se calcula sobre lo que se cobra (con descuento, si lo hay):
 * `commissionRateBps` está en centésimas de porcentaje (800 = 8 %).
 */
export function computeCommissionCents(chargedCents: number, commissionRateBps: number): number {
  return Math.floor((chargedCents * commissionRateBps) / 10_000);
}

/** ¿Es un % admitido? Múltiplo de 5 entre `min` y el tope. */
export function isValidDiscountPct(pct: number, min = 0): boolean {
  return (
    Number.isInteger(pct) &&
    pct >= min &&
    pct <= MAX_SLOT_OFFER_DISCOUNT_PCT &&
    pct % SLOT_OFFER_DISCOUNT_STEP_PCT === 0
  );
}

/**
 * ¿Son válidos los tramos? Cada uno admitido, el más cercano con al
 * menos un 5 % (si no, no hay oferta) y nunca menos descuento en un
 * tramo más cercano. Las mismas reglas las garantiza un CHECK en BD.
 */
export function areValidSlotOfferDiscounts(d: SlotOfferDiscounts): boolean {
  return (
    isValidDiscountPct(d.over2h) &&
    isValidDiscountPct(d.oneToTwoHours) &&
    isValidDiscountPct(d.underOneHour, SLOT_OFFER_DISCOUNT_STEP_PCT) &&
    d.over2h <= d.oneToTwoHours &&
    d.oneToTwoHours <= d.underOneHour
  );
}

/**
 * Último momento en que se puede reservar con la oferta: el mismo
 * margen de antelación mínima que cualquier reserva (30 min).
 */
export function getSlotOfferExpiresAt(startAt: Date): Date {
  return new Date(startAt.getTime() - MIN_BOOKING_LEAD_TIME_MS);
}

/** Precio de una reserva tras aplicar (o no) una oferta de hueco. */
export interface SlotPrice {
  priceCents: number;
  /** `null` si no hay descuento vigente. */
  discountPct: number | null;
  /** Precio de referencia (el del servicio); `null` sin descuento. */
  originalPriceCents: number | null;
}

/**
 * Precio de un hueco para un servicio, con o sin oferta.
 *
 * Si el tramo vigente tiene 0 %, el hueco se cobra a precio normal y
 * no se presenta como rebajado: nunca una «oferta» que no rebaja nada.
 */
export function priceSlot(
  servicePriceCents: number,
  discounts: SlotOfferDiscounts | null,
  startAt: Date,
  now: Date,
): SlotPrice {
  const pct = discounts ? getCurrentDiscountPct(discounts, startAt, now) : 0;
  if (pct === 0) {
    return { priceCents: servicePriceCents, discountPct: null, originalPriceCents: null };
  }
  return {
    priceCents: applyDiscountCents(servicePriceCents, pct),
    discountPct: pct,
    originalPriceCents: servicePriceCents,
  };
}
