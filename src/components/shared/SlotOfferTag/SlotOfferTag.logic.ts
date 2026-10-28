// Import directo al archivo client-safe, nunca al barrel de availability
// (arrastraría Prisma al bundle del navegador).
import { BUSINESS_TIMEZONE } from '@/lib/services/availability/availability.client';
import type { AppLocale } from '@/i18n/routing';
import { toIntlLocale } from '@/lib/i18n';
import type { ProviderSlotOffer } from '@/types/domain';

/**
 * Lógica pura de la etiqueta de hueco liberado.
 *
 * Fechas y horas SIEMPRE en la zona del centro: la etiqueta dice a qué
 * hora hay que estar en el local, no la hora del navegador del turista.
 */

/** Clave `YYYY-MM-DD` de un instante en la zona del centro. */
function businessDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Cuándo es el hueco, en corto: «17:00» si es hoy y «vie 17:00» si es
 * otro día. Un hueco liberado tras una cancelación puede ser de mañana
 * o de la semana que viene; decir solo «17:00» sería engañoso.
 *
 * @param startAtIso — inicio del hueco en ISO-8601.
 * @param locale — idioma de la interfaz.
 * @param now — instante de referencia para decidir qué es «hoy».
 */
export function formatOfferWhen(
  startAtIso: string,
  locale: AppLocale,
  now: Date = new Date(),
): string {
  const start = new Date(startAtIso);
  const intlLocale = toIntlLocale(locale);
  const time = new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BUSINESS_TIMEZONE,
  }).format(start);

  if (businessDayKey(start) === businessDayKey(now)) return time;

  const weekday = new Intl.DateTimeFormat(intlLocale, {
    weekday: 'short',
    timeZone: BUSINESS_TIMEZONE,
  })
    .format(start)
    .replace('.', '');
  return `${weekday} ${time}`;
}

/**
 * Enlace al flujo de reserva con el servicio y el hueco ya elegidos.
 *
 * Ruta interna sin prefijo de locale: el `Link` de next-intl lo añade.
 * El precio no viaja: lo recalcula el servidor al crear la reserva.
 */
export function buildSlotOfferHref(providerSlugWithId: string, offer: ProviderSlotOffer): string {
  const params = new URLSearchParams({ serviceId: offer.serviceId, slot: offer.startAtIso });
  return `/centro/${providerSlugWithId}/reservar?${params.toString()}`;
}
