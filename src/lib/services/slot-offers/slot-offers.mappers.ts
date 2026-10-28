/**
 * Conversión de filas de BD a tipos del dominio y filtro de vendidas.
 */
import type { LiveSlotOffer } from './slot-offers.types';

interface OfferRow {
  id: string;
  providerId: string;
  professionalId: string;
  serviceId: string;
  startAt: Date;
  endAt: Date;
  expiresAt: Date;
  discountPctOver2h: number;
  discountPct1To2h: number;
  discountPctUnder1h: number;
}

export function toLiveSlotOffer(row: OfferRow): LiveSlotOffer {
  return {
    id: row.id,
    providerId: row.providerId,
    professionalId: row.professionalId,
    serviceId: row.serviceId,
    startAt: row.startAt,
    endAt: row.endAt,
    expiresAt: row.expiresAt,
    discounts: {
      over2h: row.discountPctOver2h,
      oneToTwoHours: row.discountPct1To2h,
      underOneHour: row.discountPctUnder1h,
    },
  };
}

/**
 * Quita las ofertas cuyo hueco ya pisa una reserva activa: o se vendió,
 * o alguien reservó una hora de la rejilla normal que se solapa. En los
 * dos casos ya no hay hueco que anunciar.
 */
export function withoutOccupied<T extends { professionalId: string; startAt: Date; endAt: Date }>(
  offers: T[],
  bookings: { professionalId: string; startAt: Date; endAt: Date }[],
): T[] {
  return offers.filter(
    (offer) =>
      !bookings.some(
        (b) =>
          b.professionalId === offer.professionalId &&
          b.startAt < offer.endAt &&
          b.endAt > offer.startAt,
      ),
  );
}
