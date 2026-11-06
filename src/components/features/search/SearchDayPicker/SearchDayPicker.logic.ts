import {
  addDaysToDateKey,
  getDayOfMonth,
  getMadridDateKey,
  getWeekDateKeys,
  getWeekStartKey,
} from '@/lib/utils/madrid-week';
import { SEARCH_DAYS_AHEAD } from '@/lib/utils/search-when';

import type { SearchDayCell } from './SearchDayPicker.types';

/**
 * Semanas completas, de lunes a domingo, que cubren los próximos días. Hoy se
 * calcula en Madrid, como el servidor: desde otra zona el calendario no debe
 * ofrecer un día que el buscador descartaría.
 *
 * @param now — instante de referencia.
 * @returns filas de siete celdas.
 */
export function buildDayGrid(now: Date): SearchDayCell[][] {
  const today = getMadridDateKey(now);
  const last = addDaysToDateKey(today, SEARCH_DAYS_AHEAD - 1);
  const weeks: SearchDayCell[][] = [];

  for (let start = getWeekStartKey(today); start <= last; start = addDaysToDateKey(start, 7)) {
    weeks.push(
      getWeekDateKeys(start).map((day) => {
        const dayOfMonth = getDayOfMonth(day);
        return {
          day,
          dayOfMonth,
          outOfRange: day < today || day > last,
          showMonth: day === today || (dayOfMonth === 1 && day > today),
        };
      }),
    );
  }
  return weeks;
}

/** Marcador de un día civil para formatearlo en UTC. */
function toMarker(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/**
 * Iniciales de los días de la semana, de lunes a domingo, en el idioma activo.
 *
 * @param week — fila del calendario.
 * @param locale — idioma activo.
 */
export function getWeekdayLabels(week: readonly SearchDayCell[], locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });
  return week.map((cell) => format.format(toMarker(cell.day)));
}

/** Mes abreviado de un día («nov»). */
export function formatCellMonth(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(toMarker(day));
}

/** Fecha completa para lectores de pantalla («sábado, 8 de noviembre»). */
export function formatCellLabel(day: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(toMarker(day));
}
