import {
  AVAILABILITY_BUCKET_MINUTES,
  AVAILABLE_SOON_WINDOW_MINUTES,
  BUSINESS_TIMEZONE,
} from './availability.constants';
import { availabilityRepository } from './availability.repository';
import {
  computeProviderAvailability,
  type ProviderAvailabilityMap,
} from './availability.status.calc';
import { floorToBucket, getCivilDaysInWindow } from './availability.time';
import type { Slot } from './availability.types';
import { getProvidersAvailabilitySchema } from './availability.validation';

/**
 * Disponibilidad real de un conjunto de proveedores, en batch.
 *
 * Es la fachada que consume el listado público `/buscar` y la ficha de
 * proveedor. Sustituye al placeholder optimista que marcaba a todo el
 * catálogo como `available_now`.
 *
 * Coste: exactamente DOS consultas, independientemente de cuántos
 * proveedores y profesionales haya. El troceado de slots es CPU pura en
 * Node reutilizando el motor de `availability.calc`.
 */

/**
 * Margen extra al pedir reservas, para no perder las que empiezan justo
 * antes del corte y siguen ocupando después. 48h cubre de sobra
 * cualquier servicio real y ahorra aritmética frágil de zona horaria.
 */
const BOOKINGS_LOOKAHEAD_MS = 48 * 60 * 60 * 1000;

/**
 * Calcula el estado de disponibilidad (`available_now` / `available_soon`
 * / `busy`) de cada proveedor indicado.
 *
 * Degradación deliberada: un proveedor con horario corrupto, sin
 * profesionales o sin servicios activos sale como `busy` y se registra
 * en el log (llega a Sentry), pero NO lanza. Un proveedor roto no puede
 * tumbar el listado entero — mismo criterio que la API de slots de la
 * ficha de servicio, que devuelve lista vacía en vez de un 500.
 *
 * @param providerIds — proveedores a evaluar. Lista vacía no toca BD.
 * @param now — instante de referencia; por defecto, el actual. Se
 *   redondea a bloques de 5 min para que el render sea determinista.
 * @returns mapa `providerId → ProviderAvailability` con entrada para
 *   todos los ids recibidos.
 */
export async function getProvidersAvailability(
  providerIds: readonly string[],
  now: Date = new Date(),
): Promise<ProviderAvailabilityMap> {
  const { providerIds: ids } = getProvidersAvailabilitySchema.parse({
    providerIds: [...providerIds],
  });

  if (ids.length === 0) return new Map();

  const bucketedNow = floorToBucket(now, AVAILABILITY_BUCKET_MINUTES);

  // Rango de reservas: desde ahora hasta el final del último día civil
  // que vamos a inspeccionar, con margen. Calculamos el día completo
  // (no solo la próxima hora) para poder poblar `nextSlot` con el hueco
  // de la tarde aunque el estado acabe siendo `busy`.
  const windowEnd = new Date(bucketedNow.getTime() + AVAILABLE_SOON_WINDOW_MINUTES * 60_000);
  const civilDays = getCivilDaysInWindow(bucketedNow, windowEnd, BUSINESS_TIMEZONE);
  const lastDay = civilDays[civilDays.length - 1];
  const bookingsTo = new Date(lastDay.getTime() + BOOKINGS_LOOKAHEAD_MS);

  // Las dos lecturas son independientes entre sí (la de reservas filtra
  // por providerId, no por professionalId) y van en paralelo.
  const [bundles, bookings] = await Promise.all([
    availabilityRepository.findScheduleBundlesForProviders(ids),
    availabilityRepository.findBookingsForProviders(ids, bucketedNow, bookingsTo),
  ]);

  const bookingsByProfessional = new Map<string, Slot[]>();
  for (const booking of bookings) {
    const list = bookingsByProfessional.get(booking.professionalId);
    if (list) {
      list.push({ startAt: booking.startAt, endAt: booking.endAt });
    } else {
      bookingsByProfessional.set(booking.professionalId, [
        { startAt: booking.startAt, endAt: booking.endAt },
      ]);
    }
  }

  return computeProviderAvailability({
    now: bucketedNow,
    providerIds: ids,
    bundles,
    bookingsByProfessional,
    timezone: BUSINESS_TIMEZONE,
    onInvalidSchedule: (bundle, issues) => {
      console.error(
        '[availability] schedule inválido en professional %s (provider %s):',
        bundle.professionalId,
        bundle.providerId,
        issues,
      );
    },
  });
}
