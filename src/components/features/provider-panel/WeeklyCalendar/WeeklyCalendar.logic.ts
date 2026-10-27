import {
  addDaysToDateKey,
  getDayOfMonth,
  getMadridDateKey,
  getMadridWeekStartKey,
  getWeekDateKeys,
} from '@/lib/utils/madrid-week';

import type { BookingActionRow } from '../BookingActionsList/BookingActionsList.logic';
import type { PanelBookingActionStatus } from '../BookingActionsList/BookingActionsList.types';
import {
  PANEL_CALENDAR_END_HOUR,
  PANEL_CALENDAR_START_HOUR,
  type CalendarDay,
  type CalendarWeek,
  type PanelBookingStatus,
  type PositionedRow,
  type WeekdayKey,
} from './WeeklyCalendar.types';

/**
 * Orden visible de los días en la cabecera del calendario.
 * Coincide con el `weekday` de la reserva (0 = lunes ... 6 = domingo).
 */
export const WEEKDAY_KEYS: readonly WeekdayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

/** Alto en píxeles de una franja de 1 hora en la cuadrícula. */
export const HOUR_HEIGHT_PX = 60;

/** Alto mínimo de un bloque para que el texto y el toque sigan siendo usables. */
const MIN_BLOCK_HEIGHT_PX = 28;

/**
 * Convierte una hora `HH:mm` en minutos totales desde medianoche.
 *
 * @throws en caso de que el formato no sea válido.
 */
function parseTimeToMinutes(time: string): number {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time format: ${time}`);
  }
  return hours * 60 + minutes;
}

/**
 * Minutos de inicio y fin de una reserva dentro de su día. Si termina
 * después de medianoche, la cortamos a las 24:00 de su columna.
 */
function getMinutesSpan(row: BookingActionRow): { startMin: number; endMin: number } {
  const startMin = parseTimeToMinutes(row.booking.startTime);
  const endRaw = parseTimeToMinutes(row.booking.endTime);
  return { startMin, endMin: endRaw <= startMin ? 24 * 60 : endRaw };
}

/** Estado visual del bloque: `refunded` se pinta como `cancelled`. */
export function toBlockStatus(status: PanelBookingActionStatus): PanelBookingStatus {
  return status === 'refunded' ? 'cancelled' : status;
}

/**
 * Horas que muestra la columna lateral.
 *
 * Por defecto 08:00–21:00, ampliado para que quepa cualquier reserva
 * fuera de esa franja: antes una cita a las 07:00 se pintaba por
 * encima de la cuadrícula.
 */
export function getHoursRange(rows: BookingActionRow[]): number[] {
  let first = PANEL_CALENDAR_START_HOUR;
  let last = PANEL_CALENDAR_END_HOUR;
  for (const row of rows) {
    const { startMin, endMin } = getMinutesSpan(row);
    first = Math.min(first, Math.floor(startMin / 60));
    last = Math.max(last, Math.ceil(endMin / 60));
  }
  return Array.from({ length: last - first }, (_, i) => first + i);
}

/** Formatea una hora entera (`8`) como `08:00`. */
export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * Agrupa las reservas por día y calcula su posición en la columna.
 *
 * @param rows — reservas con acciones ya resueltas.
 * @param firstHour — primera hora visible (de `getHoursRange`).
 * @param formatPrice — formateador de importes del locale activo.
 */
export function groupRowsByWeekday(
  rows: BookingActionRow[],
  firstHour: number,
  formatPrice: (cents: number) => string,
): Record<WeekdayKey, PositionedRow[]> {
  const grouped: Record<WeekdayKey, PositionedRow[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  for (const row of rows) {
    const key = WEEKDAY_KEYS[row.booking.weekday];
    if (!key) continue;
    const { startMin, endMin } = getMinutesSpan(row);
    grouped[key].push({
      row,
      topPx: ((startMin - firstHour * 60) / 60) * HOUR_HEIGHT_PX,
      heightPx: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT_PX, MIN_BLOCK_HEIGHT_PX),
      priceLabel: formatPrice(row.booking.priceCents),
    });
  }

  for (const key of WEEKDAY_KEYS) {
    grouped[key].sort((a, b) => a.topPx - b.topPx);
  }
  return grouped;
}

/**
 * Día que abre la vista móvil: hoy si la semana lo incluye; si no, el
 * primero con reservas; si no hay ninguna, el lunes.
 */
export function getInitialDayIndex(
  days: CalendarDay[],
  grouped: Record<WeekdayKey, PositionedRow[]>,
): number {
  const today = days.findIndex((d) => d.isToday);
  if (today >= 0) return today;
  const withBookings = days.findIndex((d) => grouped[d.key].length > 0);
  return withBookings >= 0 ? withBookings : 0;
}

/**
 * Resuelve la semana que pinta el calendario: los 7 días con su fecha
 * y los destinos de navegación.
 *
 * @param weekStartKey — lunes de la semana mostrada (`YYYY-MM-DD`).
 * @param now — momento actual, para marcar hoy y la semana actual.
 * @param intlLocale — locale BCP 47 para las fechas del rango.
 */
export function buildCalendarWeek(
  weekStartKey: string,
  now: Date,
  intlLocale: string,
): CalendarWeek {
  const currentWeek = getMadridWeekStartKey(now);
  const todayKey = getMadridDateKey(now);
  const dateKeys = getWeekDateKeys(weekStartKey);

  // Las claves son fechas civiles: las formateamos como medianoche UTC
  // para que la zona del servidor no mueva el día.
  const formatDay = new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const toLabel = (key: string) => formatDay.format(new Date(`${key}T00:00:00.000Z`));

  return {
    days: dateKeys.map((dateKey, i) => ({
      key: WEEKDAY_KEYS[i],
      dateKey,
      dayOfMonth: getDayOfMonth(dateKey),
      isToday: dateKey === todayKey,
    })),
    nav: {
      startLabel: toLabel(dateKeys[0]),
      endLabel: toLabel(dateKeys[6]),
      previousWeek: addDaysToDateKey(weekStartKey, -7),
      nextWeek: addDaysToDateKey(weekStartKey, 7),
      currentWeek,
      isCurrentWeek: weekStartKey === currentWeek,
    },
  };
}
