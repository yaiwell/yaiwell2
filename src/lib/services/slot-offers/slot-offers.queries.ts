/**
 * Lecturas de huecos liberados: la oferta vigente de un hueco (para el
 * precio de la reserva), las de listados y selector, las del panel y
 * los huecos libres que el profesional puede liberar.
 */
import type { Prisma } from '@prisma/client';

import {
  BUSINESS_TIMEZONE,
  getCivilDaysInWindow,
  getServiceDaySlots,
} from '@/lib/services/availability';
// Ruta directa: el barrel de schedule-blocks importa el servicio entero.
import { scheduleBlocksRepository } from '@/lib/services/schedule-blocks/schedule-blocks.repository';
import { getEarliestBookableStart } from '@/lib/utils/booking-lead-time';
import { SLOT_OFFER_TIER_2H_MS, getCurrentDiscountPct } from '@/lib/utils/slot-offer-pricing';

import { toLiveSlotOffer, withoutOccupied } from './slot-offers.mappers';
import { slotOffersRepository } from './slot-offers.repository';
import type { LiveSlotOffer, ReleasableFreeSlot, SlotOfferSummary } from './slot-offers.types';

/**
 * Oferta reservable para un hueco exacto, o `null`.
 *
 * Es lo que consulta `createBooking`: el descuento se aplica a quien
 * reserve esa hora, llegue por donde llegue (la misma hora nunca se
 * vende a dos precios). No revisa ocupación: `createBooking` ya lo hace.
 */
export async function findLiveOfferForSlot(
  professionalId: string,
  serviceId: string,
  startAt: Date,
  now: Date = new Date(),
  db?: Prisma.TransactionClient,
): Promise<LiveSlotOffer | null> {
  const row = await slotOffersRepository.findLiveForSlot(
    professionalId,
    serviceId,
    startAt,
    now,
    db,
  );
  return row ? toLiveSlotOffer(row) : null;
}

/**
 * Quita las ofertas ya ocupadas por una reserva o tapadas por un bloqueo
 * de agenda. Es el punto común de todos los listados (tarjetas, mapa,
 * ficha, filtro «Con descuento», calendario del panel): sin los bloqueos,
 * una oferta liberada a la vez que se creaba un bloqueo seguía anunciada
 * aunque el servidor no la deja comprar.
 */
async function keepFree(offers: LiveSlotOffer[], now: Date): Promise<LiveSlotOffer[]> {
  if (offers.length === 0) return offers;
  const from = new Date(Math.min(...offers.map((o) => o.startAt.getTime())));
  const to = new Date(Math.max(...offers.map((o) => o.endAt.getTime())));
  const [bookings, blocks] = await Promise.all([
    slotOffersRepository.findActiveBookingSpans(
      [...new Set(offers.map((o) => o.professionalId))],
      from,
      to,
      now,
    ),
    scheduleBlocksRepository.findSpansForProviders(
      [...new Set(offers.map((o) => o.providerId))],
      from,
      to,
    ),
  ]);
  return withoutOccupied(offers, [...bookings, ...blocks]);
}

/**
 * Mejor oferta vigente de cada centro, para tarjetas, mapa y ficha:
 * la de mayor descuento ahora y, a igualdad, la más próxima. Solo
 * entran ofertas con descuento > 0 en este momento.
 */
export async function getBestOfferByProvider(
  providerIds: string[],
  now: Date = new Date(),
): Promise<Map<string, SlotOfferSummary>> {
  const rows = await slotOffersRepository.findLiveForProviders(providerIds, now);
  const offers = await keepFree(rows.map(toLiveSlotOffer), now);

  const best = new Map<string, SlotOfferSummary>();
  for (const offer of offers) {
    const pct = getCurrentDiscountPct(offer.discounts, offer.startAt, now);
    if (pct === 0) continue;
    const current = best.get(offer.providerId);
    if (!current || pct > current.discountPct) {
      best.set(offer.providerId, {
        offerId: offer.id,
        serviceId: offer.serviceId,
        startAtIso: offer.startAt.toISOString(),
        discountPct: pct,
      });
    }
  }
  return best;
}

/** Ofertas vigentes y libres de un servicio en un rango (selector de hora). */
export async function getLiveOffersForService(
  serviceId: string,
  from: Date,
  to: Date,
  now: Date = new Date(),
): Promise<LiveSlotOffer[]> {
  const rows = await slotOffersRepository.findLiveForService(serviceId, from, to, now);
  return keepFree(rows.map(toLiveSlotOffer), now);
}

/**
 * Ofertas activas sin vender de un centro en un rango, para pintarlas
 * en el calendario del panel. Las vendidas se ven como su reserva.
 */
export async function getOpenOffersForProviderRange(
  providerId: string,
  from: Date,
  to: Date,
  now: Date = new Date(),
): Promise<LiveSlotOffer[]> {
  const rows = await slotOffersRepository.findActiveForProviderRange(providerId, from, to);
  return keepFree(rows.map(toLiveSlotOffer), now);
}

/**
 * Huecos libres de las próximas 2 h que el profesional puede liberar
 * con descuento: los que el motor ofrecería ahora para cada servicio
 * activo y cada profesional que lo presta, menos los que ya tienen
 * oferta de ese profesional.
 */
export async function listReleasableFreeSlots(
  providerId: string,
  now: Date = new Date(),
): Promise<ReleasableFreeSlot[]> {
  const windowEnd = new Date(now.getTime() + SLOT_OFFER_TIER_2H_MS);
  const earliest = getEarliestBookableStart(now);
  const [serviceIds, existing, professionals] = await Promise.all([
    slotOffersRepository.findActiveServiceIds(providerId),
    slotOffersRepository.findActiveForProviderRange(providerId, earliest, windowEnd),
    slotOffersRepository.findActiveProfessionals(providerId),
  ]);
  const nameById = new Map(professionals.map((p) => [p.id, p.name]));
  // Un hueco que pisa una oferta activa no se puede liberar otra vez.
  const overlapsOffer = (professionalId: string, start: Date, end: Date) =>
    existing.some((o) => o.professionalId === professionalId && o.startAt < end && o.endAt > start);
  // La ventana puede cruzar la medianoche de Madrid: miramos los dos días.
  const days = getCivilDaysInWindow(earliest, windowEnd, BUSINESS_TIMEZONE);

  const result: ReleasableFreeSlot[] = [];
  for (const serviceId of serviceIds) {
    for (const day of days) {
      const engine = await getServiceDaySlots(serviceId, day, now).catch(() => null);
      if (!engine) continue;
      for (const [professionalId, slots] of engine.slotsByProfessional) {
        for (const slot of slots) {
          if (slot.startAt >= windowEnd) continue;
          if (overlapsOffer(professionalId, slot.startAt, slot.endAt)) continue;
          result.push({
            serviceId,
            startAtIso: slot.startAt.toISOString(),
            endAtIso: slot.endAt.toISOString(),
            professionalId,
            professionalName: nameById.get(professionalId) ?? '',
          });
        }
      }
    }
  }
  return result.sort((a, b) => a.startAtIso.localeCompare(b.startAtIso));
}
