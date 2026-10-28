/**
 * Servicio de huecos liberados con descuento (CLAUDE.md §4.bis).
 *
 * Crea y retira ofertas. Las lecturas para listados y el selector de
 * hora viven en `slot-offers.queries.ts`.
 */
import { Prisma } from '@prisma/client';

import {
  BUSINESS_TIMEZONE,
  availabilityRepository,
  getCivilDayUtc,
  getServiceDaySlots,
} from '@/lib/services/availability';
import { getEarliestBookableStart } from '@/lib/utils/booking-lead-time';
import {
  SLOT_OFFER_TIER_2H_MS,
  getSlotOfferExpiresAt,
  type SlotOfferDiscounts,
} from '@/lib/utils/slot-offer-pricing';

import {
  SlotOfferAlreadyExistsError,
  SlotOfferForbiddenError,
  SlotOfferNotFoundError,
  SlotOfferOutsideWindowError,
  SlotOfferServiceInvalidError,
  SlotOfferSlotTakenError,
  SlotOfferSourceNotCancelledError,
} from './slot-offers.errors';
import { toLiveSlotOffer } from './slot-offers.mappers';
import { slotOffersRepository, type CreateSlotOfferData } from './slot-offers.repository';
import {
  releaseCancelledSlotSchema,
  releaseFreeSlotSchema,
  withdrawSlotOfferSchema,
} from './slot-offers.validation';
import type { LiveSlotOffer } from './slot-offers.types';

const RELEASABLE_STATUSES = new Set(['cancelled', 'refunded']);

/**
 * Carga el servicio elegido y comprueba que es del negocio del usuario,
 * está activo y lo presta ese profesional (o cualquiera del centro).
 */
async function loadOwnedService(serviceId: string, providerUserId: string, providerId: string) {
  const service = await slotOffersRepository.findServiceWithOwner(serviceId);
  if (!service || service.deletedAt || !service.isActive || service.providerId !== providerId) {
    throw new SlotOfferServiceInvalidError();
  }
  if (service.provider.userId !== providerUserId) {
    throw new SlotOfferForbiddenError();
  }
  return service;
}

/**
 * Dos ofertas que se solapan en el mismo profesional (p. ej. 10:00 y
 * 10:30) confundirían: solo una puede venderse. El índice único solo
 * cubre la misma hora de inicio; esto cubre el solape.
 */
async function assertNoOverlappingOffer(professionalId: string, start: Date, end: Date, now: Date) {
  if (await slotOffersRepository.hasActiveOfferOverlap(professionalId, start, end, now)) {
    throw new SlotOfferAlreadyExistsError();
  }
}

/** Inserta la oferta traduciendo las violaciones de unicidad. */
async function insertOffer(data: CreateSlotOfferData): Promise<LiveSlotOffer> {
  try {
    return toLiveSlotOffer(await slotOffersRepository.create(data));
  } catch (err) {
    // P2002: ya hay oferta para esa reserva de origen, o una activa en
    // la misma hora del profesional (índice único parcial).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new SlotOfferAlreadyExistsError();
    }
    throw err;
  }
}

/**
 * Libera con descuento el hueco que dejó una reserva cancelada.
 *
 * La hora y el profesional salen de la reserva, nunca del cliente. Se
 * puede ofrecer otro servicio del negocio siempre que quepa en la franja.
 *
 * @param input — `{ bookingId, serviceId?, discounts }`, validado con Zod.
 * @param providerUserId — `User.id` del dueño autenticado.
 * @throws SlotOfferNotFoundError, SlotOfferForbiddenError,
 *   SlotOfferSourceNotCancelledError, SlotOfferServiceInvalidError,
 *   SlotOfferOutsideWindowError, SlotOfferSlotTakenError,
 *   SlotOfferAlreadyExistsError.
 */
export async function releaseCancelledSlot(
  input: unknown,
  providerUserId: string,
  now: Date = new Date(),
): Promise<LiveSlotOffer> {
  const data = releaseCancelledSlotSchema.parse(input);

  const booking = await slotOffersRepository.findBookingForRelease(data.bookingId);
  if (!booking) throw new SlotOfferNotFoundError();
  if (booking.provider.userId !== providerUserId) throw new SlotOfferForbiddenError();
  if (!RELEASABLE_STATUSES.has(booking.status)) throw new SlotOfferSourceNotCancelledError();

  const service = await loadOwnedService(
    data.serviceId ?? booking.serviceId,
    providerUserId,
    booking.providerId,
  );
  // El checkout reserva siempre con el profesional que el motor asigna
  // al servicio (el suyo o, si no tiene, el primero del centro): una
  // oferta en otro profesional se anunciaría sin poder comprarse.
  const effectiveProfessionalId =
    service.professionalId ??
    (await availabilityRepository.findFirstProfessionalIdForProvider(booking.providerId));
  if (effectiveProfessionalId !== booking.professionalId) {
    throw new SlotOfferServiceInvalidError();
  }
  const endAt = new Date(booking.startAt.getTime() + service.durationMinutes * 60_000);
  if (endAt > booking.endAt) throw new SlotOfferServiceInvalidError();

  if (booking.startAt < getEarliestBookableStart(now)) throw new SlotOfferOutsideWindowError();
  if (
    await slotOffersRepository.hasActiveBookingOverlap(
      booking.professionalId,
      booking.startAt,
      endAt,
      now,
    )
  ) {
    throw new SlotOfferSlotTakenError();
  }
  await assertNoOverlappingOffer(booking.professionalId, booking.startAt, endAt, now);

  return insertOffer({
    providerId: booking.providerId,
    professionalId: booking.professionalId,
    serviceId: service.id,
    sourceBookingId: booking.id,
    startAt: booking.startAt,
    endAt,
    expiresAt: getSlotOfferExpiresAt(booking.startAt),
    discounts: data.discounts,
  });
}

/**
 * Libera con descuento un hueco libre que empieza en menos de 2 h.
 *
 * Solo vale una hora que el motor de disponibilidad ofrecería ahora
 * mismo para ese servicio: así respeta horario, buffer, reservas y la
 * antelación de 30 min sin repetir esas reglas aquí.
 */
export async function releaseFreeSlot(
  input: unknown,
  providerUserId: string,
  providerId: string,
  now: Date = new Date(),
): Promise<LiveSlotOffer> {
  const data = releaseFreeSlotSchema.parse(input);
  await loadOwnedService(data.serviceId, providerUserId, providerId);

  if (data.startAt.getTime() - now.getTime() >= SLOT_OFFER_TIER_2H_MS) {
    throw new SlotOfferOutsideWindowError();
  }

  const day = getCivilDayUtc(data.startAt, BUSINESS_TIMEZONE);
  const { professionalId, durationMinutes, slots } = await getServiceDaySlots(
    data.serviceId,
    day,
    now,
  );
  const slot = slots.find((s) => s.startAt.getTime() === data.startAt.getTime());
  if (!slot) throw new SlotOfferSlotTakenError();
  const endAt = new Date(slot.startAt.getTime() + durationMinutes * 60_000);
  await assertNoOverlappingOffer(professionalId, slot.startAt, endAt, now);

  return insertOffer({
    providerId,
    professionalId,
    serviceId: data.serviceId,
    sourceBookingId: null,
    startAt: slot.startAt,
    endAt,
    expiresAt: getSlotOfferExpiresAt(slot.startAt),
    discounts: data.discounts satisfies SlotOfferDiscounts,
  });
}

/** Retira una oferta activa del negocio del usuario. Idempotente. */
export async function withdrawSlotOffer(
  input: unknown,
  providerUserId: string,
  now: Date = new Date(),
): Promise<void> {
  const { offerId } = withdrawSlotOfferSchema.parse(input);
  const offer = await slotOffersRepository.findWithOwner(offerId);
  if (!offer) throw new SlotOfferNotFoundError();
  if (offer.provider.userId !== providerUserId) throw new SlotOfferForbiddenError();
  if (offer.status === 'withdrawn') return;
  await slotOffersRepository.withdraw(offerId, now);
}

/**
 * Retira la oferta con la que se vendió una reserva que el proveedor
 * acaba de cancelar.
 *
 * «Vendida» se deriva de la reserva, así que sin esto la oferta volvería
 * a anunciarse sola al quedar el hueco libre. El proveedor decide de
 * nuevo si lo libera (la reserva cancelada puede ser origen de otra).
 * Uso interno: la titularidad ya la comprobó la cancelación.
 */
export async function retireOfferOfCancelledBooking(
  slotOfferId: string,
  now: Date = new Date(),
): Promise<void> {
  await slotOffersRepository.withdrawIfActive(slotOfferId, now);
}
