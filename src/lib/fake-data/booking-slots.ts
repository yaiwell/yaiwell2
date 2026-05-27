import type { AvailabilitySlot } from '@/types/domain';

/**
 * Generador determinista de slots de reserva mock.
 *
 * Objetivo: producir un calendario "creíble" para el flujo de reserva
 * sin tocar BD ni librerías pesadas. Dos reservas hechas con el mismo
 * `(providerId, serviceId, date)` devuelven exactamente los mismos
 * slots para evitar saltos visuales entre renders o navegaciones.
 *
 * Estrategia:
 *  - Generamos slots cada `STEP_MINUTES` minutos entre la apertura y
 *    el cierre del centro (con pausa al mediodía).
 *  - Marcamos ~30% como ocupados de forma determinista a partir de un
 *    hash de la fecha + proveedor + offset del slot para que coincidan
 *    los huecos en cada visita.
 *  - Excluimos slots del pasado cuando la fecha es hoy.
 *  - Si la duración del servicio excede el espacio restante hasta el
 *    cierre, el slot tampoco se ofrece (no cabría completarlo).
 */

const STEP_MINUTES = 30;

/**
 * Horario tipo "centro urbano": mañana 09:00-14:00 y tarde 16:00-20:30.
 * Pensado para que el calendario muestre una pausa visible al mediodía
 * y la UI no parezca un bloque monótono.
 */
const SCHEDULE = {
  morningStart: 9 * 60, // 09:00 en minutos desde medianoche
  morningEnd: 14 * 60, // 14:00
  afternoonStart: 16 * 60, // 16:00
  afternoonEnd: 20 * 60 + 30, // 20:30
} as const;

/**
 * Slot de reserva mock con la información que el calendario necesita
 * para renderizar la cuadrícula: hora, duración del servicio y si
 * está libre u ocupado.
 */
export interface BookingSlot {
  /** ISO string del inicio del slot. Usamos string para que sea serializable entre Server/Client Components. */
  startAtIso: string;
  /** ISO string del fin (incluye la duración real del servicio). */
  endAtIso: string;
  /** `true` si está libre; `false` si está ocupado por otra reserva fake. */
  available: boolean;
}

/**
 * Hash trivial determinista de un string a un entero no negativo.
 * No criptográfico — solo necesitamos algo estable y disperso para
 * decidir qué slots aparecen como ocupados.
 */
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Devuelve la clave `YYYY-MM-DD` de una fecha en zona horaria local,
 * usada como parte del seed determinista. Evitamos `toISOString()`
 * porque colapsaría días distintos si el cliente está en otra zona.
 */
export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Construye un `Date` para el día `date` a la hora `minutesFromMidnight`
 * en la zona horaria local del usuario, manteniendo el resto a cero.
 */
function atMinutes(date: Date, minutesFromMidnight: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setMinutes(minutesFromMidnight);
  return next;
}

/**
 * Genera los slots disponibles de un profesional para un día concreto
 * en función de la duración del servicio reservado.
 *
 * Determinismo: el mismo `(providerId, serviceId, date)` siempre produce
 * la misma lista de slots con los mismos huecos ocupados. Esto evita que
 * el usuario vea un calendario distinto al recargar la página y simplifica
 * los tests sin necesidad de fakeTimers complejos.
 *
 * @param providerId — identificador estable del proveedor.
 * @param serviceId — identificador estable del servicio (afecta a la duración esperada).
 * @param date — día a consultar (resolución a nivel de día local).
 * @param serviceDurationMinutes — duración real del servicio en minutos.
 * @param now — instante de referencia para excluir slots pasados (default `new Date()`).
 * @returns lista de slots ordenados ascendentemente.
 */
export function generateBookingSlots(
  providerId: string,
  serviceId: string,
  date: Date,
  serviceDurationMinutes: number,
  now: Date = new Date(),
): BookingSlot[] {
  const slots: BookingSlot[] = [];
  const dateKey = getDateKey(date);
  const seed = `${providerId}::${serviceId}::${dateKey}`;
  const baseHash = hashSeed(seed);

  const windows: Array<readonly [number, number]> = [
    [SCHEDULE.morningStart, SCHEDULE.morningEnd],
    [SCHEDULE.afternoonStart, SCHEDULE.afternoonEnd],
  ];

  for (const [windowStart, windowEnd] of windows) {
    for (let m = windowStart; m + serviceDurationMinutes <= windowEnd; m += STEP_MINUTES) {
      const startAt = atMinutes(date, m);
      const endAt = new Date(startAt.getTime() + serviceDurationMinutes * 60_000);

      // Slots cuya hora de inicio ya pasó no se ofrecen como reservables.
      // Esto se nota especialmente cuando el usuario consulta "hoy".
      if (startAt.getTime() <= now.getTime()) continue;

      // Determinismo: combinamos el hash base con el offset minute-of-day
      // mediante xor + multiplicación para que un cambio mínimo en el
      // seed se propague a todos los bits y dos proveedores consecutivos
      // produzcan patrones de ocupación claramente distintos.
      // ~30% de los slots aparecen ocupados, suficiente para que la UI
      // parezca viva sin frustrar al usuario en la demo.
      const mixed = ((baseHash ^ (m * 2654435761)) >>> 0) % 100;
      const isOccupied = mixed < 30;

      slots.push({
        startAtIso: startAt.toISOString(),
        endAtIso: endAt.toISOString(),
        available: !isOccupied,
      });
    }
  }

  return slots;
}

/**
 * Construye la lista de los próximos `days` días empezando por `from`,
 * usada por el calendario del SlotPicker para renderizar las pestañas
 * navegables de día.
 *
 * @param from — fecha de inicio (incluida).
 * @param days — cantidad de días a generar.
 * @returns array de fechas a las 00:00 de su día local.
 */
export function buildUpcomingDays(from: Date, days: number): Date[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({ length: days }, (_, i) => {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    return next;
  });
}

/**
 * Variante de `generateBookingSlots` que devuelve `AvailabilitySlot`
 * con `Date` real en lugar de ISO strings. Útil para tests o para
 * cuando ya estamos en un Server Component que no serializa al cliente.
 */
export function toAvailabilitySlot(slot: BookingSlot): AvailabilitySlot {
  return {
    startAt: new Date(slot.startAtIso),
    endAt: new Date(slot.endAtIso),
  };
}
