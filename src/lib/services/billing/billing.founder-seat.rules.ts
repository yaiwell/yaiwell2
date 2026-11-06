/**
 * Reglas puras del año de Premium de regalo en Mallorca (CLAUDE.md §4.bis).
 */

/** Plazas de la promoción. Las plazas usadas no se liberan. */
export const FOUNDER_SEATS_TOTAL = 50;

/** Duración del regalo desde la aprobación. */
export const FOUNDER_SEAT_MONTHS = 12;

/** Días antes del final en los que se avisa al negocio. */
export const FOUNDER_SEAT_NOTICE_DAYS = { first: 60, last: 15 } as const;

// Rectángulo de la isla: deja fuera a Menorca (lng > 3,5) y a Eivissa (lng < 2,3).
const MALLORCA_BOUNDS = { minLat: 39.1, maxLat: 40, minLng: 2.3, maxLng: 3.5 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Se puede contratar un plan desde 24 h antes del final, y la plaza se cierra en
 * el primer cron tras vencer: quien quiera seguir pagando no pierde servicios.
 */
const SALE_OPENS_BEFORE_END_MS = DAY_MS;

/** Motivos por los que un negocio de Mallorca no recibe plaza. */
export type FounderSeatBlockReason =
  | 'no_service'
  | 'no_schedule'
  | 'paid_subscription'
  | 'seats_exhausted';

/** ¿El punto del negocio está en Mallorca? */
export function isInMallorca(lat: number, lng: number): boolean {
  return (
    lat >= MALLORCA_BOUNDS.minLat &&
    lat <= MALLORCA_BOUNDS.maxLat &&
    lng >= MALLORCA_BOUNDS.minLng &&
    lng <= MALLORCA_BOUNDS.maxLng
  );
}

/** Fin del regalo: misma fecha, `FOUNDER_SEAT_MONTHS` meses después. */
export function founderSeatEnd(startsAt: Date): Date {
  const end = new Date(startsAt);
  end.setUTCMonth(end.getUTCMonth() + FOUNDER_SEAT_MONTHS);
  return end;
}

/** Instante hasta el que no se vende ningún plan a quien tiene plaza. */
export function founderSaleOpensAt(endsAt: Date): Date {
  return new Date(endsAt.getTime() - SALE_OPENS_BEFORE_END_MS);
}

/** ¿Sigue bloqueada la contratación de planes? */
export function isFounderSeatLocked(endsAt: Date, now: Date): boolean {
  return founderSaleOpensAt(endsAt).getTime() > now.getTime();
}

/**
 * ¿Algún día del horario tiene franjas? El JSON viene de BD: cualquier forma
 * inesperada cuenta como horario vacío en vez de regalar la plaza.
 */
export function hasOpenHours(schedule: unknown): boolean {
  if (typeof schedule !== 'object' || schedule === null) return false;
  return Object.values(schedule).some((day) => Array.isArray(day) && day.length > 0);
}

/**
 * Aviso que toca hoy, o `null`. Si el cron estuvo parado y ya se está dentro de
 * los últimos 15 días, sale solo el último: dos correos seguidos no aportan.
 */
export function dueFounderNotice(
  seat: { endsAt: Date; notified60At: Date | null; notified15At: Date | null },
  now: Date,
): 'first' | 'last' | null {
  const daysLeft = (seat.endsAt.getTime() - now.getTime()) / DAY_MS;
  if (daysLeft <= 0) return null;
  if (daysLeft <= FOUNDER_SEAT_NOTICE_DAYS.last) return seat.notified15At ? null : 'last';
  if (daysLeft <= FOUNDER_SEAT_NOTICE_DAYS.first) return seat.notified60At ? null : 'first';
  return null;
}
