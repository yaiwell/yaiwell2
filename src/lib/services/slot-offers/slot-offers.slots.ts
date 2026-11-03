/**
 * Huecos de un servicio en un día, con la oferta vigente de cada uno.
 *
 * Une la rejilla normal del motor con las horas liberadas con
 * descuento, que pueden no caer en esa rejilla (la rejilla depende de
 * la duración del servicio y la reserva cancelada era de otro).
 */
import { BUSINESS_TIMEZONE, getCivilDayUtc, getServiceDaySlots } from '@/lib/services/availability';
// Ruta directa: el servicio de bloqueos importa `booking`, que usa este módulo.
import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks/schedule-blocks.repository';
import { priceSlot } from '@/lib/utils/slot-offer-pricing';

import { findLiveOfferForSlot, getLiveOffersForService } from './slot-offers.queries';
import { slotOffersRepository } from './slot-offers.repository';

/** Hueco reservable con su precio si está liberado con descuento. */
export interface PricedSlot {
  startAt: Date;
  endAt: Date;
  /** `null` si se cobra el precio normal del servicio. */
  offer: {
    offerId: string;
    discountPct: number;
    priceCents: number;
    originalPriceCents: number;
  } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MARGIN_MS = 3 * 60 * 60 * 1000;

/**
 * @param serviceId — servicio a reservar.
 * @param date — medianoche UTC del día civil de Madrid (igual que el motor).
 * @param now — instante de referencia (antelación y tramo vigente).
 * @throws las mismas excepciones que `getServiceDaySlots`.
 */
export async function getPricedSlotsForService(
  serviceId: string,
  date: Date,
  now: Date = new Date(),
): Promise<PricedSlot[]> {
  const { professionalId, slots } = await getServiceDaySlots(serviceId, date, now);
  const service = await slotOffersRepository.findServiceWithOwner(serviceId);
  if (!service) return [];

  // El día civil de Madrid va de 22:00/23:00 UTC del día anterior a
  // igual hora del día: pedimos con margen y filtramos por día civil.
  const from = new Date(date.getTime() - MARGIN_MS);
  const to = new Date(date.getTime() + DAY_MS + MARGIN_MS);
  const [liveOffers, blocks] = await Promise.all([
    getLiveOffersForService(serviceId, from, to, now),
    // Una oferta bajo un bloqueo de agenda no se puede comprar: no se anuncia.
    scheduleBlocksRepository.findSpansForProfessional(professionalId, from, to),
  ]);
  const offers = liveOffers.filter(
    (o) =>
      o.professionalId === professionalId &&
      getCivilDayUtc(o.startAt, BUSINESS_TIMEZONE).getTime() === date.getTime() &&
      !blocks.some((b) => b.startAt < o.endAt && b.endAt > o.startAt),
  );

  const byStart = new Map<number, PricedSlot>();
  for (const slot of slots) {
    byStart.set(slot.startAt.getTime(), { startAt: slot.startAt, endAt: slot.endAt, offer: null });
  }
  for (const offer of offers) {
    const price = priceSlot(service.priceCents, offer.discounts, offer.startAt, now);
    byStart.set(offer.startAt.getTime(), {
      startAt: offer.startAt,
      endAt: offer.endAt,
      offer:
        price.discountPct !== null && price.originalPriceCents !== null
          ? {
              offerId: offer.id,
              discountPct: price.discountPct,
              priceCents: price.priceCents,
              originalPriceCents: price.originalPriceCents,
            }
          : null,
    });
  }
  return [...byStart.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * ¿Es `startAt` una hora que ofrecemos para este servicio y profesional?
 * Lo es si está en la rejilla del motor (horario, buffer, reservas,
 * bloqueos de agenda y antelación) o si tiene una oferta de hueco
 * vigente que ningún bloqueo de agenda pise.
 *
 * `createBooking` lo exige: el servidor solo acepta lo que la UI ofrece.
 */
export async function isBookableStart(
  serviceId: string,
  professionalId: string,
  startAt: Date,
  now: Date = new Date(),
): Promise<boolean> {
  const offer = await findLiveOfferForSlot(professionalId, serviceId, startAt, now);
  if (offer) {
    // Crear un bloqueo retira las ofertas que pisa; esto cubre la que se
    // colase entre medias o una fila antigua.
    return !(await scheduleBlocksRepository.hasActiveOverlap(
      professionalId,
      offer.startAt,
      offer.endAt,
    ));
  }
  const day = getCivilDayUtc(startAt, BUSINESS_TIMEZONE);
  const engine = await getServiceDaySlots(serviceId, day, now).catch(() => null);
  return (
    engine !== null &&
    engine.professionalId === professionalId &&
    engine.slots.some((slot) => slot.startAt.getTime() === startAt.getTime())
  );
}
