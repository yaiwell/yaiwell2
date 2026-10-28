import { PANEL_TIMEZONE } from '@/lib/utils/madrid-week';

/** Día de la semana del panel: 0 = lunes … 6 = domingo. */
export type PanelWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const WEEKDAY_BY_SHORT: Record<string, PanelWeekday> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/**
 * Devuelve el día de la semana en hora Madrid (0=lunes .. 6=domingo).
 *
 * Usa Intl con timeZone fija para que el cálculo no dependa de la
 * zona horaria del servidor (Vercel = UTC). Sin esto, una reserva
 * del lunes a las 00:30 Madrid se vería en la columna del domingo.
 */
export function weekdayInMadrid(date: Date): PanelWeekday {
  const short = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: PANEL_TIMEZONE,
  }).format(date);
  return WEEKDAY_BY_SHORT[short] ?? 0;
}

/** Formatea una fecha como "HH:mm" en hora Madrid. */
export function timeInMadrid(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PANEL_TIMEZONE,
  }).format(date);
}
