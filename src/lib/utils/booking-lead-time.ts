/**
 * Antelación mínima con la que puede nacer una reserva.
 *
 * Decisión de producto: 30 minutos. La promesa de Yaiwell es la
 * espontaneidad ("disponible ahora"), así que la antelación tiene que
 * ser lo más corta posible, pero no cero: el centro necesita un margen
 * para ver la reserva entrar y el cliente, para desplazarse. Con 2 h
 * (el valor anterior) el listado anunciaba huecos que nadie podía
 * comprar. Las reservas que nacen a menos de 2 h son "de última hora"
 * y tienen sus propias condiciones (ver `booking-last-minute.ts`).
 *
 * Vive en `lib/utils` —y no dentro de `lib/services/booking`— porque lo
 * necesitan **todos los lados**: el schema Zod que valida en servidor,
 * el motor de disponibilidad que alimenta el selector y "Disponible
 * ahora", y el flujo de reserva en cliente, que descarta un hueco
 * caducado antes de mandarlo a una action que lo rechazaría. Un módulo
 * sin Prisma ni `server-only` es lo único que un Client Component puede
 * importar sin arrastrar `pg` al bundle.
 *
 * La autoridad sigue siendo el servidor: el chequeo de cliente sólo
 * evita enseñarle al usuario un hueco que ya sabemos condenado.
 */

/** Margen mínimo entre crear la reserva y el inicio del slot (30 minutos). */
export const MIN_BOOKING_LEAD_TIME_MS = 30 * 60 * 1000;

/**
 * Primer instante en que puede empezar una reserva creada en `now`.
 *
 * Se expone para que el motor de disponibilidad y la validación usen
 * exactamente la misma aritmética (límite incluido).
 *
 * @param now — momento de referencia.
 */
export function getEarliestBookableStart(now: Date): Date {
  return new Date(now.getTime() + MIN_BOOKING_LEAD_TIME_MS);
}

/**
 * Indica si un instante de inicio respeta la antelación mínima.
 *
 * El límite es inclusivo: un hueco que empieza justo a 30:00 es válido;
 * a 29:59, no.
 *
 * @param startMs — inicio del hueco en milisegundos epoch.
 * @param now — momento de referencia.
 */
export function meetsMinBookingLeadTime(startMs: number, now: Date): boolean {
  return startMs >= getEarliestBookableStart(now).getTime();
}

/**
 * Indica si un slot todavía admite reserva en el momento dado.
 *
 * @param slotStartIso — inicio del hueco en ISO-8601.
 * @param now — momento de referencia; parametrizable para tests.
 * @returns `false` si la fecha es inválida o falta menos de la
 *   antelación mínima para el inicio.
 */
export function isSlotStillBookable(slotStartIso: string, now: Date = new Date()): boolean {
  const startMs = new Date(slotStartIso).getTime();
  if (Number.isNaN(startMs)) return false;
  return meetsMinBookingLeadTime(startMs, now);
}
