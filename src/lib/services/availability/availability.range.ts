import { getEarliestBookableStart } from '@/lib/utils/booking-lead-time';
import { SEARCH_DAYS_AHEAD, type SearchWhen } from '@/lib/utils/search-when';

import { BUSINESS_TIMEZONE, BUSY_MARGIN_MS } from './availability.constants';
import { availabilityRepository } from './availability.repository';
import { groupBusy } from './availability.service-day';
import { findNextSlotForProfessional } from './availability.status.calc';
import { getCivilDayUtc } from './availability.time';
import type { Slot } from './availability.types';
import { getProvidersAvailabilitySchema } from './availability.validation';

/**
 * ¿Tiene hueco este proveedor en este rango de días?
 *
 * Es una pregunta distinta de `getProvidersAvailability` («¿tiene hueco en
 * la próxima hora?»), pero con el mismo criterio: un hueco cuenta si cabe el
 * servicio más corto del profesional y respeta la antelación mínima.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Días civiles que cubre cada opción, en la zona del negocio.
 *
 * «Esta semana» llega hasta el domingo: en domingo equivale a «hoy». Sumar
 * 24 h es seguro porque los marcadores son fechas puras, sin cambio de hora.
 *
 * @param when — rango pedido.
 * @param now — instante de referencia.
 * @param timezone — zona IANA del negocio.
 */
export function resolveWhenDays(when: SearchWhen, now: Date, timezone: string): Date[] {
  const today = getCivilDayUtc(now, timezone);
  const dayAfter = (offset: number) => new Date(today.getTime() + offset * DAY_MS);

  if (when === 'today') return [today];
  if (when === 'tomorrow') return [dayAfter(1)];

  // `getUTCDay` es correcto en un marcador: domingo = 0.
  const daysLeft = (7 - today.getUTCDay()) % 7;
  return Array.from({ length: daysLeft + 1 }, (_, offset) => dayAfter(offset));
}

/**
 * Días elegidos en el calendario que aún se pueden ofrecer, ordenados. Un enlace
 * guardado puede traer días pasados, y una URL a mano, días muy lejanos: sin este
 * tope, un solo día de 2099 haría cargar años de reservas.
 *
 * @param days — claves `YYYY-MM-DD` ya validadas.
 * @param now — instante de referencia.
 * @param timezone — zona IANA del negocio.
 */
export function resolvePickedDays(days: readonly string[], now: Date, timezone: string): Date[] {
  const today = getCivilDayUtc(now, timezone).getTime();
  const last = today + (SEARCH_DAYS_AHEAD - 1) * DAY_MS;
  return days
    .map((day) => new Date(`${day}T00:00:00.000Z`))
    .filter((marker) => marker.getTime() >= today && marker.getTime() <= last)
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Primer hueco de cada proveedor dentro del rango, en lote.
 *
 * Tres consultas, sean cuantos sean los proveedores. Un proveedor sin hueco
 * o con el horario corrupto no aparece en el mapa, sin tumbar el listado.
 *
 * @param providerIds — proveedores a evaluar. Lista vacía no toca BD.
 * @param range — rango de días o lista de días elegidos en el calendario.
 * @param now — instante de referencia; inyectable en tests.
 * @returns mapa `providerId → primer hueco` solo con los que tienen alguno.
 */
export async function getFirstSlotInRangeByProvider(
  providerIds: readonly string[],
  range: SearchWhen | readonly string[],
  now: Date = new Date(),
): Promise<Map<string, Slot>> {
  const { providerIds: ids } = getProvidersAvailabilitySchema.parse({
    providerIds: [...providerIds],
  });
  const result = new Map<string, Slot>();
  if (ids.length === 0) return result;

  const civilDays =
    typeof range === 'string'
      ? resolveWhenDays(range, now, BUSINESS_TIMEZONE)
      : resolvePickedDays(range, now, BUSINESS_TIMEZONE);
  if (civilDays.length === 0) return result;
  const lastDay = civilDays[civilDays.length - 1];
  const from = new Date(civilDays[0].getTime() - BUSY_MARGIN_MS);
  const to = new Date(lastDay.getTime() + DAY_MS + BUSY_MARGIN_MS);

  const [bundles, bookings, blocks] = await Promise.all([
    availabilityRepository.findScheduleBundlesForProviders(ids),
    availabilityRepository.findBookingsForProviders(ids, from, to),
    availabilityRepository.findScheduleBlocksForProviders(ids, from, to),
  ]);
  // Un bloqueo ocupa igual que una reserva: el motor puro no los distingue.
  const busyByProfessional = groupBusy([...bookings, ...blocks]);
  const bookableFrom = getEarliestBookableStart(now);

  for (const bundle of bundles) {
    if (!ids.includes(bundle.providerId)) continue;
    const slot = findNextSlotForProfessional({
      bundle,
      bookableFrom,
      civilDays,
      bookings: busyByProfessional.get(bundle.professionalId) ?? [],
      timezone: BUSINESS_TIMEZONE,
      onInvalidSchedule: (invalid, issues) => {
        console.error(
          '[availability] invalid schedule for professional %s (provider %s):',
          invalid.professionalId,
          invalid.providerId,
          issues,
        );
      },
    });
    const current = result.get(bundle.providerId);
    if (slot && (!current || slot.startAt.getTime() < current.startAt.getTime())) {
      result.set(bundle.providerId, slot);
    }
  }
  return result;
}
