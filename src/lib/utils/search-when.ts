/**
 * Filtro temporal de `/buscar` (`?when=`).
 *
 * Vive en `lib/utils`, sin Prisma ni `server-only`, porque lo usan la URL,
 * el sheet de filtros y el Hero, que son de cliente, y el motor de
 * disponibilidad, en servidor.
 */

/** Rangos de días que entiende el buscador. */
export const SEARCH_WHEN_OPTIONS = ['today', 'tomorrow', 'this-week'] as const;

export type SearchWhen = (typeof SEARCH_WHEN_OPTIONS)[number];

/** Días sueltos que se pueden pedir a la vez (`?days=`). */
export const SEARCH_DAYS_MAX = 7;

/** Días hacia delante que ofrece el calendario, hoy incluido. */
export const SEARCH_DAYS_AHEAD = 28;

/** ¿Es `YYYY-MM-DD` y existe en el calendario (sin 31 de febrero)? */
function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const marker = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(marker.getTime()) && marker.toISOString().slice(0, 10) === value;
}

/**
 * Lee `?days=2026-11-08,2026-11-12`. Descarta lo inválido, ordena y recorta al
 * máximo: una URL mal copiada debe seguir abriendo algo. Los días ya pasados
 * los descarta el motor de disponibilidad, que es quien sabe qué día es hoy.
 *
 * @param value — valor crudo de `?days=`.
 */
export function parseSearchDays(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  const days = value
    .split(',')
    .map((day) => day.trim())
    .filter(isCalendarDay);
  return [...new Set(days)].sort().slice(0, SEARCH_DAYS_MAX);
}

/**
 * Texto corto de un día civil («sáb, 8 nov»). `UTC` porque la clave ya es una
 * fecha pura: con la zona del navegador se podría ver el día anterior.
 *
 * @param day — clave `YYYY-MM-DD`.
 * @param locale — idioma activo.
 */
export function formatSearchDay(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00.000Z`));
}

/**
 * Valida un valor de la URL. Un valor desconocido no filtra: una URL mal
 * copiada debe seguir abriendo algo.
 *
 * @param value — valor crudo de `?when=`.
 */
export function parseSearchWhen(value: unknown): SearchWhen | null {
  return SEARCH_WHEN_OPTIONS.includes(value as SearchWhen) ? (value as SearchWhen) : null;
}
