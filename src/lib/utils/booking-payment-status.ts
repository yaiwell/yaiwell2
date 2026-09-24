/**
 * Lectura del estado de pago de una reserva para la UI de confirmación.
 *
 * El criterio de "¿puedo decirle al cliente que su reserva está
 * confirmada?" vive aquí y no repartido por las pantallas: lo consultan
 * la página `/confirmacion` (servidor) y la server action que consulta
 * el estado desde el flujo en línea. Que ambas lo deriven del mismo sitio
 * es justo lo que faltaba cuando el camino sin 3DS cantaba "¡Reserva
 * confirmada!" mientras la reserva seguía en `pending`.
 */

/**
 * Estados en los que el cobro ya está resuelto a favor del cliente.
 *
 * `completed` entra porque una reserva ya atendida estuvo confirmada
 * antes; mostrarla como "pago en curso" sería un retroceso informativo.
 * `cancelled` y `refunded` NO entran: no son una confirmación.
 */
const SETTLED_STATUSES = new Set(['confirmed', 'completed']);

/**
 * Indica si el pago de la reserva está liquidado según el webhook.
 *
 * @param status — estado tal y como está persistido en BD.
 * @returns `true` sólo si podemos prometer una reserva confirmada.
 */
export function isBookingPaymentSettled(status: string): boolean {
  return SETTLED_STATUSES.has(status);
}
