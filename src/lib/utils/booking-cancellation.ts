/**
 * Política de cancelación de reservas (§4.bis de CLAUDE.md).
 *
 * El proveedor puede cancelar una reserva siempre que falten al menos
 * 2h hasta `startAt`. Por debajo de 2h, la cancelación queda bloqueada
 * en UI y debe rechazarse también en API. El mismo umbral aplica al
 * cliente por simetría en esta maqueta (en Fase 1 la política del
 * cliente puede divergir, pero hoy compartimos lógica para la mock).
 *
 * Centralizamos el cálculo en una función pura para poder reusarlo
 * desde server components, hooks de cliente y tests sin duplicar.
 */

/** Umbral mínimo, en milisegundos, para permitir cancelar (2 horas). */
const MIN_CANCELLATION_LEAD_MS = 2 * 60 * 60 * 1000;

/**
 * Estados de reserva que se consideran activos y, por tanto,
 * candidatos a poder cancelarse. El resto (`completed`, `cancelled`,
 * `refunded`) ya no son cancelables por definición.
 */
const ACTIVE_STATUSES = new Set(['pending', 'confirmed']);

/**
 * Indica si una reserva puede cancelarse en este momento dado.
 *
 * @param booking — reserva a evaluar (subset mínimo necesario).
 * @param now — momento de referencia (por defecto `new Date()`).
 *   Recibirlo como parámetro permite tests deterministas y compartir
 *   "ahora" con la generación de datos fake.
 * @returns `true` si quedan ≥ 2h para `startAt` y el estado es activo.
 */
export function canCancelBooking(
  booking: { startAt: Date; status: string },
  now: Date = new Date(),
): boolean {
  if (!ACTIVE_STATUSES.has(booking.status)) {
    return false;
  }
  const leadMs = booking.startAt.getTime() - now.getTime();
  return leadMs >= MIN_CANCELLATION_LEAD_MS;
}

/**
 * Devuelve los milisegundos que faltan hasta `startAt`. Negativo si la
 * reserva ya ha pasado. Útil para mostrar tooltips "no se puede
 * cancelar a menos de 2h" con el tiempo restante exacto.
 */
export function getLeadTimeMs(startAt: Date, now: Date = new Date()): number {
  return startAt.getTime() - now.getTime();
}
