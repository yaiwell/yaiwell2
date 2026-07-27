import type { ProviderAvailability } from '@/types/domain';

import { computeAvailableSlots } from './availability.calc';
import {
  AVAILABLE_NOW_WINDOW_MINUTES,
  AVAILABLE_SOON_WINDOW_MINUTES,
} from './availability.constants';
import { getCivilDaysInWindow } from './availability.time';
import type { ProfessionalScheduleBundle, Slot } from './availability.types';
import { weeklyScheduleSchema } from './availability.validation';

/**
 * Cálculo puro del estado de disponibilidad de un conjunto de
 * proveedores.
 *
 * Este módulo NO toca Prisma: recibe los horarios y las reservas ya
 * cargados en batch y devuelve el estado por proveedor. Mantenerlo puro
 * permite testear los umbrales y los bordes de medianoche/DST sin mocks,
 * y habilita reutilizarlo desde un cron si algún día materializamos el
 * resultado en BD (ver `TODO.md`).
 *
 * Reutiliza `computeAvailableSlots` en lugar de reimplementar el
 * troceado: así el fix de zona horaria vive en un único sitio.
 */

/** Resultado por proveedor, indexado por `providerId`. */
export type ProviderAvailabilityMap = Map<string, ProviderAvailability>;

/**
 * Estado por defecto de un proveedor del que no podemos afirmar nada.
 *
 * Sesgamos deliberadamente hacia `busy`: un falso "disponible ahora"
 * manda a un cliente a una puerta cerrada (reseña negativa, daño de
 * marca); un falso "sin hueco" solo cuesta una impresión.
 */
function unknownAvailability(): ProviderAvailability {
  return { status: 'busy', nextSlot: null };
}

/**
 * Deriva el estado a partir de los minutos que faltan para el próximo
 * hueco. Los umbrales viven en `availability.constants`.
 */
function statusFromMinutes(minutesUntilNext: number): ProviderAvailability['status'] {
  if (minutesUntilNext <= AVAILABLE_NOW_WINDOW_MINUTES) return 'available_now';
  if (minutesUntilNext <= AVAILABLE_SOON_WINDOW_MINUTES) return 'available_soon';
  return 'busy';
}

/**
 * Calcula el primer hueco libre de un profesional a partir de `now`,
 * recorriendo los días civiles indicados.
 *
 * Devuelve `null` si el horario no es válido, si no hay duración de
 * servicio utilizable o si no queda ningún hueco.
 */
function findNextSlotForProfessional(params: {
  bundle: ProfessionalScheduleBundle;
  now: Date;
  civilDays: readonly Date[];
  bookings: readonly Slot[];
  timezone: string;
  onInvalidSchedule?: (bundle: ProfessionalScheduleBundle, issues: unknown) => void;
}): Slot | null {
  const { bundle, now, civilDays, bookings, timezone, onInvalidSchedule } = params;

  // Sin servicios activos no hay nada reservable, por muy abierto que
  // esté el profesional.
  if (bundle.minServiceDurationMinutes === null || bundle.minServiceDurationMinutes <= 0) {
    return null;
  }

  const parsed = weeklyScheduleSchema.safeParse(bundle.schedule);
  if (!parsed.success) {
    // Horario corrupto en BD. No lanzamos: un proveedor roto no puede
    // tumbar el listado entero. Mismo criterio que la API de la ficha
    // de servicio, que devuelve lista vacía en vez de un 500.
    onInvalidSchedule?.(bundle, parsed.error.issues);
    return null;
  }

  let best: Slot | null = null;
  for (const day of civilDays) {
    const slots = computeAvailableSlots({
      date: day,
      schedule: parsed.data,
      bufferMinutes: bundle.bufferMinutes,
      serviceDurationMinutes: bundle.minServiceDurationMinutes,
      bookings,
      timezone,
    });
    for (const slot of slots) {
      // Descartamos lo que ya pasó: el motor devuelve el día entero.
      if (slot.startAt.getTime() < now.getTime()) continue;
      if (!best || slot.startAt.getTime() < best.startAt.getTime()) {
        best = slot;
      }
    }
  }

  return best;
}

/**
 * Calcula el estado de disponibilidad de cada proveedor solicitado.
 *
 * Un proveedor está tan disponible como su profesional más libre: para
 * un centro con varios profesionales gana el primer hueco de cualquiera
 * de ellos.
 *
 * `nextSlot` se devuelve SIEMPRE que exista un hueco en los días
 * calculados, incluso cuando el estado resultante es `busy` (hueco a más
 * de una hora vista). Cuesta cero — los slots ya están calculados — y
 * permite que la UI diga "Hoy a las 19:00" en lugar del engañoso "Sin
 * hueco hoy".
 *
 * @param params.providerIds — proveedores a evaluar; los que no tengan
 *   datos utilizables saldrán como `busy`.
 * @param params.bundles — horarios de los profesionales de esos proveedores.
 * @param params.bookingsByProfessional — reservas activas por profesional.
 * @param params.onInvalidSchedule — callback para reportar horarios
 *   corruptos (el service lo usa para loguear a Sentry).
 * @returns mapa `providerId → ProviderAvailability`, con entrada para
 *   todos los `providerIds` recibidos.
 */
export function computeProviderAvailability(params: {
  now: Date;
  providerIds: readonly string[];
  bundles: readonly ProfessionalScheduleBundle[];
  bookingsByProfessional: ReadonlyMap<string, readonly Slot[]>;
  timezone: string;
  onInvalidSchedule?: (bundle: ProfessionalScheduleBundle, issues: unknown) => void;
}): ProviderAvailabilityMap {
  const { now, providerIds, bundles, bookingsByProfessional, timezone, onInvalidSchedule } = params;

  const result: ProviderAvailabilityMap = new Map();
  for (const providerId of providerIds) {
    result.set(providerId, unknownAvailability());
  }

  // Ventana de días civiles a inspeccionar. Calculamos el día completo
  // (no solo la próxima hora) para poder poblar `nextSlot` con el hueco
  // de la tarde; el segundo día solo entra si estamos cerca de medianoche.
  const windowEnd = new Date(now.getTime() + AVAILABLE_SOON_WINDOW_MINUTES * 60_000);
  const civilDays = getCivilDaysInWindow(now, windowEnd, timezone);

  for (const bundle of bundles) {
    // Ignoramos profesionales de proveedores que no se pidieron.
    if (!result.has(bundle.providerId)) continue;

    const nextSlot = findNextSlotForProfessional({
      bundle,
      now,
      civilDays,
      bookings: bookingsByProfessional.get(bundle.professionalId) ?? [],
      timezone,
      onInvalidSchedule,
    });
    if (!nextSlot) continue;

    const current = result.get(bundle.providerId);
    const currentStart = current?.nextSlot?.startAt.getTime() ?? Number.POSITIVE_INFINITY;
    if (nextSlot.startAt.getTime() >= currentStart) continue;

    const minutesUntilNext = Math.round((nextSlot.startAt.getTime() - now.getTime()) / 60_000);
    result.set(bundle.providerId, {
      status: statusFromMinutes(minutesUntilNext),
      nextSlot,
    });
  }

  return result;
}
