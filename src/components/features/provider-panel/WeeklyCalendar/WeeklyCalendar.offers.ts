import {
  HOUR_HEIGHT_PX,
  MIN_BLOCK_HEIGHT_PX,
  WEEKDAY_KEYS,
  getMinutesSpan,
} from './WeeklyCalendar.logic';
import type { PanelSlotOffer, PositionedOffer, WeekdayKey } from './WeeklyCalendar.types';

/**
 * Agrupa los huecos liberados por día y calcula su posición, igual que
 * las reservas. Si una oferta pisa un bloque de reserva (típicamente la
 * cancelada de la que nace), el reparto en carriles
 * (`assignLanesByWeekday`) la pinta a su lado para que ambos sigan
 * visibles.
 *
 * @param offers — ofertas abiertas de la semana.
 * @param firstHour — primera hora visible (de `getHoursRange`).
 * @param formatPrice — formateador de importes del locale activo.
 */
export function groupOffersByWeekday(
  offers: PanelSlotOffer[],
  firstHour: number,
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
    grouped[key].push({
      offer,
      topPx: ((startMin - firstHour * 60) / 60) * HOUR_HEIGHT_PX,
      heightPx: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT_PX, MIN_BLOCK_HEIGHT_PX),
      priceLabel: formatPrice(offer.priceCents),
      currentPriceLabel: formatPrice(offer.currentPriceCents),
    });
  }

  for (const key of WEEKDAY_KEYS) {
    grouped[key].sort((a, b) => a.topPx - b.topPx);
  }
  return grouped;
}
