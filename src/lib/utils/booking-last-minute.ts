/**
 * Reserva de última hora: la que empieza a menos de 2 h del momento en
 * que se reserva.
 *
 * Condiciones (decisión de producto):
 *  - Se paga online en el momento.
 *  - No admite devolución.
 *
 * Hoy todas las reservas se pagan online, así que la regla no cambia el
 * cobro: lo que añade es la obligación de avisar con claridad antes de
 * pagar. El umbral reutiliza el de cancelación del proveedor
 * (`MIN_CANCELLATION_LEAD_MS`): una reserva que nace dentro de esa
 * ventana ya no tiene margen para cancelarse, y por eso tampoco se
 * devuelve. Si un día se separan, este es el único sitio que cambiar.
 *
 * Módulo puro, sin Prisma ni `server-only`: lo importan tanto el flujo
 * de reserva (cliente) como el servidor.
 */

import { MIN_CANCELLATION_LEAD_MS } from './booking-cancellation';

/** Umbral de la reserva de última hora (2 horas). */
export const LAST_MINUTE_THRESHOLD_MS = MIN_CANCELLATION_LEAD_MS;

/**
 * Indica si reservar ahora un hueco lo convierte en reserva de última
 * hora.
 *
 * @param slotStartIso — inicio del hueco en ISO-8601.
 * @param now — momento de referencia; parametrizable para tests.
 * @returns `true` si faltan menos de 2 h para el inicio. Una fecha
 *   inválida devuelve `false`: no hay hueco del que avisar, y la
 *   validación de servidor ya lo rechazará.
 */
export function isLastMinuteBooking(slotStartIso: string, now: Date = new Date()): boolean {
  const startAt = new Date(slotStartIso);
  if (Number.isNaN(startAt.getTime())) return false;
  return isLastMinuteAtCreation(startAt, now);
}

/**
 * Indica si una reserva ya creada es de última hora: si entre su
 * creación (`createdAt`) y su inicio (`startAt`) había menos de 2 h.
 *
 * Es la versión autoritativa de la regla: el checkout la evalúa con la
 * hora del servidor y el área de cliente con los datos de BD, sin
 * depender del reloj del navegador.
 *
 * @param startAt — inicio de la reserva.
 * @param createdAt — momento en que se creó la reserva.
 */
export function isLastMinuteAtCreation(startAt: Date, createdAt: Date): boolean {
  return startAt.getTime() - createdAt.getTime() < LAST_MINUTE_THRESHOLD_MS;
}
