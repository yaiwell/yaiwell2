import { z } from 'zod';

/**
 * Semanas civiles en hora de Madrid para el panel del proveedor.
 *
 * El calendario y las métricas cortaban la semana en UTC: una reserva
 * del lunes a las 00:30 de Madrid (domingo 23:30 UTC en invierno) caía
 * fuera de su semana. Aquí la semana va de lunes 00:00 a lunes 00:00
 * **en Madrid**, así que en las semanas de cambio de hora dura 167 o
 * 169 horas, no 168.
 *
 * Trabajamos con claves de día `YYYY-MM-DD` (fechas civiles, sin hora)
 * y solo las convertimos a instantes reales al construir el rango de
 * la query. Archivo plano sin dependencias de servidor: lo pueden
 * importar Server y Client Components.
 */

/** Zona horaria del panel: Yaiwell opera en España peninsular. */
export const PANEL_TIMEZONE = 'Europe/Madrid';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Años navegables con `?semana=`; fuera de aquí se vuelve a la semana actual. */
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/** Clave `YYYY-MM-DD` que además existe en el calendario (sin 31 de febrero). */
const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((key) => {
    // Acotamos el año: con 0000-0099 o 9999 `Date` y `toISOString`
    // dan claves de otro siglo o con signo y la vista se rompe.
    const year = Number(key.slice(0, 4));
    if (year < MIN_YEAR || year > MAX_YEAR) return false;
    const marker = keyToMarker(key);
    return !Number.isNaN(marker.getTime()) && markerToKey(marker) === key;
  });

/** Fecha civil como medianoche UTC: un marcador, no un instante real. */
function keyToMarker(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function markerToKey(marker: Date): string {
  return marker.toISOString().slice(0, 10);
}

/** Lee las partes de fecha y hora de `instant` tal como se ven en `timeZone`. */
function getZonedParts(instant: Date, timeZone: string): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return values;
}

/** Desfase de la zona respecto a UTC en `instant`, en milisegundos. */
function getOffsetMs(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Instante real de las 00:00 de un día civil en Madrid.
 *
 * Se corrige el desfase dos veces porque el de la medianoche puede no
 * coincidir con el de la primera aproximación. En Madrid el cambio de
 * hora es a las 02:00/03:00, así que la medianoche siempre existe.
 */
function getMadridMidnight(dateKey: string): Date {
  const guess = keyToMarker(dateKey).getTime();
  const firstPass = guess - getOffsetMs(new Date(guess), PANEL_TIMEZONE);
  return new Date(guess - getOffsetMs(new Date(firstPass), PANEL_TIMEZONE));
}

/**
 * Clave del día civil de `instant` en Madrid.
 *
 * @param instant — momento real.
 * @returns clave `YYYY-MM-DD`.
 */
export function getMadridDateKey(instant: Date): string {
  const p = getZonedParts(instant, PANEL_TIMEZONE);
  return markerToKey(new Date(Date.UTC(p.year, p.month - 1, p.day)));
}

/** Suma (o resta) días a una clave de día civil. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  return markerToKey(new Date(keyToMarker(dateKey).getTime() + days * DAY_MS));
}

/** Lunes de la semana a la que pertenece un día civil. */
export function getWeekStartKey(dateKey: string): string {
  // getUTCDay sobre el marcador: 0 = domingo … 6 = sábado. Pasamos a 0 = lunes.
  const daysSinceMonday = (keyToMarker(dateKey).getUTCDay() + 6) % 7;
  return addDaysToDateKey(dateKey, -daysSinceMonday);
}

/** Lunes (clave) de la semana de Madrid que contiene `instant`. */
export function getMadridWeekStartKey(instant: Date): string {
  return getWeekStartKey(getMadridDateKey(instant));
}

/** Las 7 claves de día de una semana, de lunes a domingo. */
export function getWeekDateKeys(weekStartKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(weekStartKey, i));
}

/** Día del mes (1-31) de una clave de día civil. */
export function getDayOfMonth(dateKey: string): number {
  return keyToMarker(dateKey).getUTCDate();
}

/**
 * Rango de instantes de una semana de Madrid, para la query de reservas.
 *
 * @param weekStartKey — lunes de la semana (`YYYY-MM-DD`).
 * @returns `start` incluido (lunes 00:00 Madrid) y `end` excluido
 *   (lunes siguiente 00:00 Madrid).
 */
export function getMadridWeekRange(weekStartKey: string): { start: Date; end: Date } {
  return {
    start: getMadridMidnight(weekStartKey),
    end: getMadridMidnight(addDaysToDateKey(weekStartKey, 7)),
  };
}

/**
 * Rango de instantes de un día civil de Madrid (00:00 incluido, 00:00
 * del día siguiente excluido). Un día de cambio de hora dura 23 o 25 h.
 */
export function getMadridDayRange(dateKey: string): { start: Date; end: Date } {
  return {
    start: getMadridMidnight(dateKey),
    end: getMadridMidnight(addDaysToDateKey(dateKey, 1)),
  };
}

/**
 * Interpreta el parámetro `?semana=` de la URL del calendario.
 *
 * Acepta cualquier día de la semana y lo normaliza a su lunes, para que
 * un enlace compartido con un miércoles siga funcionando. Un valor
 * ausente o inválido cae en la semana actual en lugar de dar un 404:
 * es un parámetro de navegación, no un recurso.
 *
 * @param raw — valor crudo de `searchParams.semana`.
 * @param now — momento de referencia para la semana actual.
 * @returns clave del lunes de la semana a mostrar.
 */
export function parseWeekParam(raw: unknown, now: Date): string {
  const parsed = dateKeySchema.safeParse(raw);
  return parsed.success ? getWeekStartKey(parsed.data) : getMadridWeekStartKey(now);
}
