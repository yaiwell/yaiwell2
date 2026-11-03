import 'server-only';

import type { PanelFreeSlot } from '@/components/features/provider-panel/FreeSlotsSection/FreeSlotsSection.types';
import type { PanelSlotOffer } from '@/components/features/provider-panel/WeeklyCalendar/WeeklyCalendar.types';
import type { AppLocale } from '@/i18n/routing';
import { prisma } from '@/lib/db/prisma';
import { pickLocalized } from '@/lib/i18n/pickLocalized';
import { getOpenOffersForProviderRange, listReleasableFreeSlots } from '@/lib/services/slot-offers';
import { getMadridWeekRange, getMadridWeekStartKey } from '@/lib/utils/madrid-week';
import { priceSlot } from '@/lib/utils/slot-offer-pricing';
import type { LocalizedText } from '@/types/domain';

import { timeInMadrid, weekdayInMadrid } from './panel-madrid-time';
import { filterByProfessional } from './panel-professional-filter';

/** Nombre localizado y precio de cada servicio, en una sola query. */
async function loadServices(serviceIds: string[], locale: AppLocale) {
  if (serviceIds.length === 0) return new Map<string, { name: string; priceCents: number }>();
  const rows = await prisma.service.findMany({
    where: { id: { in: [...new Set(serviceIds)] } },
    select: { id: true, name: true, priceCents: true },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      {
        name: pickLocalized(r.name as unknown as LocalizedText, locale),
        priceCents: r.priceCents,
      },
    ]),
  );
}

/**
 * Huecos liberados sin vender de una semana de Madrid, para pintarlos
 * en `/panel/calendario` con el % y el precio vigentes en `now`.
 *
 * Solo entran los que aún se pueden reservar (`expiresAt` futuro): una
 * oferta que ya caducó no tiene nada que retirar ni que anunciar.
 *
 * @param providerId — Provider del usuario autenticado.
 * @param reference — cualquier instante de la semana a consultar.
 * @param locale — locale activo, para el nombre del servicio.
 * @param now — momento de referencia del % vigente.
 * @param professionalId — filtro `?pro=` ya validado; `null` = todos.
 */
export async function getPanelWeekSlotOffers(
  providerId: string,
  reference: Date,
  locale: AppLocale,
  now: Date = new Date(),
  professionalId: string | null = null,
): Promise<PanelSlotOffer[]> {
  const { start, end } = getMadridWeekRange(getMadridWeekStartKey(reference));
  const open = await getOpenOffersForProviderRange(providerId, start, end, now);
  const offers = filterByProfessional(
    open.filter((o) => o.expiresAt > now),
    professionalId,
  );
  if (offers.length === 0) return [];

  const [services, professionals] = await Promise.all([
    loadServices(
      offers.map((o) => o.serviceId),
      locale,
    ),
    prisma.professional.findMany({
      where: { id: { in: [...new Set(offers.map((o) => o.professionalId))] } },
      select: { id: true, name: true },
    }),
  ]);
  const professionalNames = new Map(professionals.map((p) => [p.id, p.name]));

  return offers.map((o) => {
    const service = services.get(o.serviceId);
    const priceCents = service?.priceCents ?? 0;
    const price = priceSlot(priceCents, o.discounts, o.startAt, now);
    return {
      id: o.id,
      startAtIso: o.startAt.toISOString(),
      weekday: weekdayInMadrid(o.startAt),
      startTime: timeInMadrid(o.startAt),
      endTime: timeInMadrid(o.endAt),
      serviceName: service?.name ?? '',
      professionalId: o.professionalId,
      professionalName: professionalNames.get(o.professionalId) ?? null,
      discounts: o.discounts,
      currentDiscountPct: price.discountPct ?? 0,
      priceCents,
      currentPriceCents: price.priceCents,
    };
  });
}

/**
 * Huecos libres de las próximas 2 h que el profesional puede liberar,
 * con el nombre del servicio localizado, la hora en Madrid y de qué
 * profesional es cada uno (con equipo, la misma hora sale por cada
 * profesional libre; al liberarla se envía su id).
 *
 * @param professionalId — filtro `?pro=` ya validado; `null` = todos.
 */
export async function getPanelReleasableFreeSlots(
  providerId: string,
  locale: AppLocale,
  now: Date = new Date(),
  professionalId: string | null = null,
): Promise<PanelFreeSlot[]> {
  const slots = filterByProfessional(
    await listReleasableFreeSlots(providerId, now),
    professionalId,
  );
  if (slots.length === 0) return [];
  const services = await loadServices(
    slots.map((s) => s.serviceId),
    locale,
  );

  return slots.map((s) => ({
    serviceId: s.serviceId,
    serviceName: services.get(s.serviceId)?.name ?? '',
    professionalId: s.professionalId,
    professionalName: s.professionalName,
    startAtIso: s.startAtIso,
    startTime: timeInMadrid(new Date(s.startAtIso)),
    endTime: timeInMadrid(new Date(s.endAtIso)),
  }));
}
