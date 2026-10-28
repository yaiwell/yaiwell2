/**
 * Repositorio de huecos liberados: solo lectura y escritura Prisma.
 *
 * Las reglas (titularidad, ventanas, tramos) viven en el servicio.
 */
import { prisma } from '@/lib/db/prisma';
// Import directo y no del barrel de `booking`: `booking.service` usa
// este módulo para aplicar el descuento y el barrel crearía un ciclo.
import { activeBookingWhere } from '@/lib/services/booking/booking.hold';
import { getEarliestBookableStart } from '@/lib/utils/booking-lead-time';
import type { SlotOfferDiscounts } from '@/lib/utils/slot-offer-pricing';

/** Columnas de la oferta que necesitan servicio y listados. */
const offerSelect = {
  id: true,
  providerId: true,
  professionalId: true,
  serviceId: true,
  startAt: true,
  endAt: true,
  expiresAt: true,
  discountPctOver2h: true,
  discountPct1To2h: true,
  discountPctUnder1h: true,
} as const;

/** Filtro de «reservable ahora»: activa, sin caducar y a ≥30 min. */
function liveWhere(now: Date) {
  return {
    status: 'active' as const,
    expiresAt: { gt: now },
    // En `AND` para no pisar el `startAt` propio de cada consulta.
    AND: [{ startAt: { gte: getEarliestBookableStart(now) } }],
  };
}

export interface CreateSlotOfferData {
  providerId: string;
  professionalId: string;
  serviceId: string;
  sourceBookingId: string | null;
  startAt: Date;
  endAt: Date;
  expiresAt: Date;
  discounts: SlotOfferDiscounts;
}

export const slotOffersRepository = {
  /** Reserva cancelada con lo necesario para liberar su hueco. */
  async findBookingForRelease(bookingId: string) {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        serviceId: true,
        professionalId: true,
        providerId: true,
        provider: { select: { userId: true } },
      },
    });
  },

  /** Servicio con su dueño, para comprobar titularidad y que cabe. */
  async findServiceWithOwner(serviceId: string) {
    return prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        providerId: true,
        professionalId: true,
        durationMinutes: true,
        priceCents: true,
        isActive: true,
        deletedAt: true,
        provider: { select: { userId: true } },
      },
    });
  },

  /** Servicios activos de un centro (huecos libres que se pueden liberar). */
  async findActiveServiceIds(providerId: string) {
    const rows = await prisma.service.findMany({
      where: { providerId, isActive: true, deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => r.id);
  },

  /** ¿Hay alguna reserva activa del profesional que pise `[start, end)`? */
  async hasActiveBookingOverlap(professionalId: string, start: Date, end: Date, now: Date) {
    const count = await prisma.booking.count({
      where: {
        professionalId,
        ...activeBookingWhere(now),
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });
    return count > 0;
  },

  async create(data: CreateSlotOfferData) {
    return prisma.slotOffer.create({
      data: {
        providerId: data.providerId,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        sourceBookingId: data.sourceBookingId,
        startAt: data.startAt,
        endAt: data.endAt,
        expiresAt: data.expiresAt,
        discountPctOver2h: data.discounts.over2h,
        discountPct1To2h: data.discounts.oneToTwoHours,
        discountPctUnder1h: data.discounts.underOneHour,
      },
      select: offerSelect,
    });
  },

  async findWithOwner(offerId: string) {
    return prisma.slotOffer.findUnique({
      where: { id: offerId },
      select: { id: true, status: true, provider: { select: { userId: true } } },
    });
  },

  async withdraw(offerId: string, now: Date) {
    return prisma.slotOffer.update({
      where: { id: offerId },
      data: { status: 'withdrawn', withdrawnAt: now },
      select: { id: true },
    });
  },

  /** Oferta reservable de un profesional, servicio y hora exactos. */
  async findLiveForSlot(professionalId: string, serviceId: string, startAt: Date, now: Date) {
    return prisma.slotOffer.findFirst({
      where: { professionalId, serviceId, startAt, ...liveWhere(now) },
      select: offerSelect,
    });
  },

  /** Ofertas reservables de varios centros, para listados. */
  async findLiveForProviders(providerIds: string[], now: Date) {
    if (providerIds.length === 0) return [];
    return prisma.slotOffer.findMany({
      where: { providerId: { in: providerIds }, ...liveWhere(now) },
      select: offerSelect,
      orderBy: { startAt: 'asc' },
    });
  },

  /** Ofertas reservables de un servicio en un rango (selector de hora). */
  async findLiveForService(serviceId: string, from: Date, to: Date, now: Date) {
    return prisma.slotOffer.findMany({
      where: { serviceId, startAt: { gte: from, lt: to }, ...liveWhere(now) },
      select: offerSelect,
      orderBy: { startAt: 'asc' },
    });
  },

  /** Ofertas activas de un centro en un rango (calendario del panel). */
  async findActiveForProviderRange(providerId: string, from: Date, to: Date) {
    return prisma.slotOffer.findMany({
      where: { providerId, status: 'active', startAt: { gte: from, lt: to } },
      select: offerSelect,
      orderBy: { startAt: 'asc' },
    });
  },

  /**
   * Reservas activas de varios profesionales en un rango: con ellas se
   * descartan las ofertas cuyo hueco ya se ha ocupado (vendidas).
   */
  async findActiveBookingSpans(professionalIds: string[], from: Date, to: Date, now: Date) {
    if (professionalIds.length === 0) return [];
    return prisma.booking.findMany({
      where: {
        professionalId: { in: professionalIds },
        ...activeBookingWhere(now),
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { professionalId: true, startAt: true, endAt: true },
    });
  },
};
