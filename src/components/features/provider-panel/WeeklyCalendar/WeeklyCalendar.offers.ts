import {
  HOUR_HEIGHT_PX,
  MIN_BLOCK_HEIGHT_PX,
  WEEKDAY_KEYS,
  getMinutesSpan,
} from './WeeklyCalendar.logic';
import type {
  PanelSlotOffer,
  PositionedOffer,
  PositionedRow,
  WeekdayKey,
} from './WeeklyCalendar.types';

/** ¿Se solapan dos franjas verticales de la columna? */
function overlaps(aTop: number, aHeight: number, bTop: number, bHeight: number): boolean {
  return aTop < bTop + bHeight && bTop < aTop + aHeight;
}

/**
 * Agrupa los huecos liberados por día y calcula su posición, igual que
 * las reservas. Si una oferta pisa un bloque de reserva (típicamente la
 * cancelada de la que nace), se marca `compact` para pintarla en la
 * mitad derecha y que ambos sigan visibles.
 *
 * @param offers — ofertas abiertas de la semana.
 * @param firstHour — primera hora visible (de `getHoursRange`).
 * @param bookingsByDay — reservas ya posicionadas, para detectar solapes.
 * @param formatPrice — formateador de importes del locale activo.
 */
export function groupOffersByWeekday(
  offers: PanelSlotOffer[],
  firstHour: number,
  bookingsByDay: Record<WeekdayKey, PositionedRow[]>,
  formatPrice: (cents: number) => string,
): Record<WeekdayKey, PositionedOffer[]> {
  const grouped: Record<WeekdayKey, PositionedOffer[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  for (const offer of offers) {
    const key = WEEKDAY_KEYS[offer.weekday];
    if (!key) continue;
    const { startMin, endMin } = getMinutesSpan(offer);
    const topPx = ((startMin - firstHour * 60) / 60) * HOUR_HEIGHT_PX;
    const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT_PX, MIN_BLOCK_HEIGHT_PX);
    grouped[key].push({
      offer,
      topPx,
      heightPx,
      compact: bookingsByDay[key].some((b) => overlaps(topPx, heightPx, b.topPx, b.heightPx)),
      priceLabel: formatPrice(offer.priceCents),
      currentPriceLabel: formatPrice(offer.currentPriceCents),
    });
  }

  for (const key of WEEKDAY_KEYS) {
    grouped[key].sort((a, b) => a.topPx - b.topPx);
  }
  return grouped;
}
