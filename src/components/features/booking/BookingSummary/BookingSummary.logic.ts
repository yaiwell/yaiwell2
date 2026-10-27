/**
 * Lógica pura de formato del paso de resumen.
 *
 * Mantenemos los helpers fuera del componente para mantener el JSX
 * presentacional puro y para poder reutilizarlos en otros pasos.
 *
 * Fechas y horas se formatean SIEMPRE en la zona del centro
 * (`BUSINESS_TIMEZONE`), igual que el selector de huecos: un cliente que
 * reserva desde Berlín o Londres debe ver la hora a la que tiene que
 * presentarse en el centro, no la de su navegador.
 */

// Import directo al archivo client-safe, nunca al barrel de availability
// (arrastraría Prisma al bundle del navegador).
import { BUSINESS_TIMEZONE } from '@/lib/services/availability/availability.client';
import { toIntlLocale } from '@/lib/i18n';
import { MIN_CANCELLATION_LEAD_MS } from '@/lib/utils/booking-cancellation';

/**
 * Formatea un slot ISO a un string "viernes 22 de mayo, 17:30" según
 * el locale. La fecha larga sirve como ancla visual fuerte en el resumen
 * para que el usuario no dude del día reservado.
 */
export function formatSlotDateLong(iso: string, locale: 'es' | 'ca' | 'en' | 'de'): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(iso));
}

/**
 * Formatea el último instante en que se puede cancelar gratis:
 * `startAt − 2 h` (umbral compartido con la política de cancelación).
 *
 * Usa el mismo formato largo que la fecha del hueco para que el usuario
 * compare las dos de un vistazo ("martes, 28 de octubre, 16:30").
 *
 * @param slotStartIso — inicio del hueco en ISO-8601.
 * @param locale — idioma de la interfaz.
 */
export function formatCancellationDeadline(
  slotStartIso: string,
  locale: 'es' | 'ca' | 'en' | 'de',
): string {
  const deadline = new Date(new Date(slotStartIso).getTime() - MIN_CANCELLATION_LEAD_MS);
  return formatSlotDateLong(deadline.toISOString(), locale);
}

/**
 * Formatea solo la hora `HH:MM` del slot. Útil para mostrar el rango
 * "17:30 → 18:30" en una sola línea.
 */
export function formatSlotTimeOnly(iso: string, locale: 'es' | 'ca' | 'en' | 'de'): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(iso));
}

/**
 * Formatea céntimos como moneda EUR con cero decimales si es exacto,
 * dos si tiene parte fraccionaria. Es el mismo criterio que usa la
 * ficha de servicio (`ProviderServicesList.logic.ts`) para mantener
 * coherencia visual entre vistas.
 */
export function formatPriceCents(cents: number, locale: 'es' | 'ca' | 'en' | 'de'): string {
  const hasDecimals = cents % 100 !== 0;
  const intlLocale = toIntlLocale(locale);

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(cents / 100);
}
