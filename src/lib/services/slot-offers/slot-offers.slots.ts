/**
 * Huecos de un servicio en un día, con la oferta vigente de cada uno, y
 * los profesionales que pueden atender una hora concreta.
 *
 * Une la rejilla normal del motor con las horas liberadas con
 * descuento, que pueden no caer en esa rejilla (la rejilla depende de
 * la duración del servicio y la reserva cancelada era de otro). Con
 * varios profesionales (CLAUDE.md §4.bis «Equipo») la rejilla es la
 * unión de todos, salvo que se pida uno concreto.
 */
import { BUSINESS_TIMEZONE, getCivilDayUtc, getServiceDaySlots } from '@/lib/services/availability';
// Ruta directa: el servicio de bloqueos importa `booking`, que usa este módulo.
import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks/schedule-blocks.repository';
import { getCurrentDiscountPct, priceSlot } from '@/lib/utils/slot-offer-pricing';

import { toLiveSlotOffer } from './slot-offers.mappers';
import { getLiveOffersForService } from './slot-offers.queries';
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

/** Profesional que puede atender una hora concreta de un servicio. */
export interface BookableCandidate {
  professionalId: string;
  /** Oferta viva suya en esa hora, con el % vigente ahora; `null` si no hay. */
  offer: { offerId: string; discountPct: number } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MARGIN_MS = 3 * 60 * 60 * 1000;

/**
 * @param serviceId — servicio a reservar.
 * @param date — medianoche UTC del día civil de Madrid (igual que el motor).
 * @param now — instante de referencia (antelación y tramo vigente).
 * @param professionalId — profesional concreto; omitido = «cualquiera».
 * @throws las mismas excepciones que `getServiceDaySlots`.
 */
export async function getPricedSlotsForService(
  serviceId: string,
  date: Date,
  now: Date = new Date(),
  professionalId?: string,
): Promise<PricedSlot[]> {
  const engine = await getServiceDaySlots(serviceId, date, now, professionalId);
  const service = await slotOffersRepository.findServiceWithOwner(serviceId);
  if (!service) return [];

  // El día civil de Madrid va de 22:00/23:00 UTC del día anterior a
  // igual hora del día: pedimos con margen y filtramos por día civil.
  const from = new Date(date.getTime() - MARGIN_MS);
  const to = new Date(date.getTime() + DAY_MS + MARGIN_MS);
  const [liveOffers, blocks] = await Promise.all([
    getLiveOffersForService(serviceId, from, to, now),
    // Una oferta bajo un bloqueo de agenda no se puede comprar: no se anuncia.
    scheduleBlocksRepository.findSpansForProviders([engine.providerId], from, to),
  ]);
  const offers = liveOffers.filter(
    (o) =>
      engine.professionalIds.includes(o.professionalId) &&
      getCivilDayUtc(o.startAt, BUSINESS_TIMEZONE).getTime() === date.getTime() &&
      !blocks.some(
        (b) => b.professionalId === o.professionalId && b.startAt < o.endAt && b.endAt > o.startAt,
      ),
  );

  const byStart = new Map<number, PricedSlot>();
  for (const slot of engine.slots) {
    byStart.set(slot.startAt.getTime(), { startAt: slot.startAt, endAt: slot.endAt, offer: null });
  }
  for (const offer of offers) {
    const price = priceSlot(service.priceCents, offer.discounts, offer.startAt, now);
    if (price.discountPct === null || price.originalPriceCents === null) {
      // Oferta sin rebaja en este tramo: la hora se vende a precio normal.
      const key = offer.startAt.getTime();
      if (!byStart.has(key)) {
        byStart.set(key, { startAt: offer.startAt, endAt: offer.endAt, offer: null });
      }
      continue;
    }
    // Una hora con oferta de cualquiera de los candidatos sale con su
    // descuento: la reserva «cualquiera» asigna primero a quien la tiene.
    // Si dos la tienen, se anuncia la mejor (es la que se asigna antes).
    const current = byStart.get(offer.startAt.getTime());
    if (current?.offer && current.offer.priceCents <= price.priceCents) continue;
    byStart.set(offer.startAt.getTime(), {
      startAt: offer.startAt,
      endAt: offer.endAt,
      offer: {
        offerId: offer.id,
        discountPct: price.discountPct,
        priceCents: price.priceCents,
        originalPriceCents: price.originalPriceCents,
      },
    });
  }
  return [...byStart.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Profesionales que pueden atender `startAt` para este servicio: los que
 * la tienen en su rejilla del motor (horario, buffer, reservas, bloqueos
 * y antelación) y los que tienen una oferta de hueco vigente a esa hora
 * que ningún bloqueo de agenda pise. Ordenados por antigüedad.
 *
 * Es orientativo: `createBooking` repite solape y bloqueos dentro de la
 * transacción de cada candidato.
 *
 * @param professionalId — limita la consulta a ese profesional.
 */
export async function getBookableCandidates(
  serviceId: string,
  startAt: Date,
  now: Date = new Date(),
  professionalId?: string,
): Promise<BookableCandidate[]> {
  const day = getCivilDayUtc(startAt, BUSINESS_TIMEZONE);
  const engine = await getServiceDaySlots(serviceId, day, now, professionalId).catch(() => null);
  if (!engine) return [];

  const fromGrid = new Set(engine.candidatesByStart.get(startAt.getTime()) ?? []);
  const offerRows = await slotOffersRepository.findLiveForServiceStart(serviceId, startAt, now);
  const offers = new Map<string, BookableCandidate['offer']>();
  for (const row of offerRows) {
    const offer = toLiveSlotOffer(row);
    if (!engine.professionalIds.includes(offer.professionalId)) continue;
    // Crear un bloqueo retira las ofertas que pisa; esto cubre la que se
    // colase entre medias o una fila antigua.
    if (
      await scheduleBlocksRepository.hasActiveOverlap(
        offer.professionalId,
        offer.startAt,
        offer.endAt,
      )
    ) {
      continue;
    }
    offers.set(offer.professionalId, {
      offerId: offer.id,
      discountPct: getCurrentDiscountPct(offer.discounts, offer.startAt, now),
    });
  }

  return engine.professionalIds
    .filter((id) => fromGrid.has(id) || offers.has(id))
    .map((id) => ({ professionalId: id, offer: offers.get(id) ?? null }));
}

/**
 * ¿Es `startAt` una hora que ofrecemos para este servicio? Con
 * profesional, si ese profesional puede atenderla; sin él
 * («cualquiera»), si al menos un candidato puede.
 *
 * `createBooking` lo exige: el servidor solo acepta lo que la UI ofrece.
 */
export async function isBookableStart(
  serviceId: string,
  professionalId: string | null,
  startAt: Date,
  now: Date = new Date(),
): Promise<boolean> {
  const candidates = await getBookableCandidates(
    serviceId,
    startAt,
    now,
    professionalId ?? undefined,
  );
  return professionalId
    ? candidates.some((c) => c.professionalId === professionalId)
    : candidates.length > 0;
}
