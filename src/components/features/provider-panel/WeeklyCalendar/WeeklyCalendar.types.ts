/** Clave de día compatible con el namespace `providerPanel.calendar`. */
export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Primera hora visible del calendario (eje vertical). */
export const PANEL_CALENDAR_START_HOUR = 8;
/** Última hora visible del calendario. */
export const PANEL_CALENDAR_END_HOUR = 21;

/**
 * Estado de una reserva del panel.
 *
 * Subset de `BookingStatus` de BD: `'refunded'` no aparece porque
 * visualmente equivale a `'cancelled'` (la página servidora hace ese
 * mapeo antes de pasar la lista al componente).
 */
export type PanelBookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

/**
 * Reserva tal y como se pinta en el calendario semanal del panel.
 *
 * View-model plano: la página servidora resuelve los joins (cliente,
 * profesional, servicio) y formatea las horas en hora local Madrid.
 */
export interface PanelBooking {
  id: string;
  /** Día de la semana en que cae (0 = lunes, 6 = domingo). */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Hora de inicio en formato 24h (`HH:mm`). */
  startTime: string;
  /** Hora de fin en formato 24h (`HH:mm`). */
  endTime: string;
  clientName: string;
  serviceName: string;
  professionalName: string | null;
  status: PanelBookingStatus;
  priceCents: number;
}

/** Reserva ya posicionada para pintarse sobre la cuadrícula. */
export interface PositionedBooking {
  booking: PanelBooking;
  /** Offset desde el inicio de la franja horaria, en píxeles (1h = 60px). */
  topPx: number;
  /** Altura del bloque en píxeles, calculada a partir de la duración. */
  heightPx: number;
}

/** Props del componente WeeklyCalendar. */
export interface WeeklyCalendarProps {
  bookings: PanelBooking[];
}

/**
 * Mapeo entre estado de reserva y clases visuales del bloque.
 * Se exporta para facilitar el render de la leyenda en otros lugares.
 */
export type BookingStatusClassMap = Record<PanelBookingStatus, string>;
