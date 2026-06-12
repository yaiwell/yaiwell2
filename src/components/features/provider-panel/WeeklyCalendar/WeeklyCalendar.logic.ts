import {
  PANEL_CALENDAR_END_HOUR,
  PANEL_CALENDAR_START_HOUR,
  type PanelBooking,
  type PositionedBooking,
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
const HOUR_HEIGHT_PX = 60;

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
 * Calcula `topPx` y `heightPx` para colocar una reserva en su columna
 * de día, asumiendo que la franja del calendario empieza a
 * `PANEL_CALENDAR_START_HOUR` y cada hora ocupa `HOUR_HEIGHT_PX`.
 */
function positionBooking(booking: PanelBooking): PositionedBooking {
  const startMin = parseTimeToMinutes(booking.startTime);
  const endMin = parseTimeToMinutes(booking.endTime);
  const baseMin = PANEL_CALENDAR_START_HOUR * 60;

  const topPx = ((startMin - baseMin) / 60) * HOUR_HEIGHT_PX;
  const heightPx = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT_PX, 24);

  return { booking, topPx, heightPx };
}

/**
 * Agrupa las reservas por día (`weekday`) y las posiciona dentro de su
 * columna para que el componente pueda pintarlas absolutamente.
 *
 * Devuelve un Record con clave `WeekdayKey` y array de bookings
 * posicionados (vacío si el día no tiene reservas).
 */
export function groupBookingsByWeekday(
  bookings: PanelBooking[],
): Record<WeekdayKey, PositionedBooking[]> {
  const grouped: Record<WeekdayKey, PositionedBooking[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  for (const booking of bookings) {
    const key = WEEKDAY_KEYS[booking.weekday];
    if (!key) continue;
    grouped[key].push(positionBooking(booking));
  }

  // Ordenamos por hora de inicio para que el render sea predecible.
  for (const key of WEEKDAY_KEYS) {
    grouped[key].sort((a, b) => a.topPx - b.topPx);
  }

  return grouped;
}

/**
 * Devuelve la lista de horas (enteras) que muestra la columna lateral.
 * Por ejemplo, para 08:00–21:00 devuelve [8, 9, ..., 20].
 *
 * Se exporta para reutilizar en cálculos visuales y en los tests.
 */
export function getHoursRange(): number[] {
  const hours: number[] = [];
  for (let h = PANEL_CALENDAR_START_HOUR; h < PANEL_CALENDAR_END_HOUR; h += 1) {
    hours.push(h);
  }
  return hours;
}

/** Formatea una hora entera (`8`) como `08:00`. */
export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
