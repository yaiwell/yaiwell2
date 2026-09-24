/**
 * Antelación mínima con la que puede nacer una reserva (§4.bis de
 * `CLAUDE.md`).
 *
 * Vive en `lib/utils` —y no dentro de `lib/services/booking`— porque lo
 * necesitan **los dos lados**: el schema Zod que valida en servidor y el
 * flujo de reserva en cliente, que descarta un hueco caducado antes de
 * mandarlo a una action que lo rechazaría. Un módulo sin Prisma ni
 * `server-only` es lo único que un Client Component puede importar sin
 * arrastrar `pg` al bundle.
 *
 * La autoridad sigue siendo el servidor: el chequeo de cliente sólo
 * evita enseñarle al usuario un hueco que ya sabemos condenado.
 */

/** Margen mínimo entre crear la reserva y el inicio del slot (2 horas). */
export const MIN_BOOKING_LEAD_TIME_MS = 2 * 60 * 60 * 1000;

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
  return startMs > now.getTime() + MIN_BOOKING_LEAD_TIME_MS;
}
