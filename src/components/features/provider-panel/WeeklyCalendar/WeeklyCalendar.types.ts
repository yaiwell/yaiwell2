import type { PanelBooking, PanelBookingStatus } from '@/lib/fake-data/panel-bookings';

/** Clave de día compatible con el namespace `providerPanel.calendar`. */
export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

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
