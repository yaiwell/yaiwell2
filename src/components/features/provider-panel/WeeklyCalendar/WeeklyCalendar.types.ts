import type { BookingActionRow } from '../BookingActionsList/BookingActionsList.logic';
import type {
  PanelBookingAction,
  SupportedLocale,
} from '../BookingActionsList/BookingActionsList.types';

/** Clave de día compatible con el namespace `providerPanel.calendar`. */
export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Primera hora visible del calendario si no hay reservas antes. */
export const PANEL_CALENDAR_START_HOUR = 8;
/** Última hora visible del calendario si no hay reservas después. */
export const PANEL_CALENDAR_END_HOUR = 21;

/**
 * Estado visual de un bloque del calendario.
 *
 * Subset de `BookingStatus` de BD: `'refunded'` se pinta como
 * `'cancelled'` (un reembolso sigue a una cancelación; en la cuadrícula
 * no merece color propio). El detalle del bloque sí los distingue.
 */
export type PanelBookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

/**
 * Reserva de ejemplo del modo preview.
 *
 * Solo tiene día de la semana y `HH:mm`; `toPreviewBookingActions` la
 * convierte en `PanelBookingAction` sin instante real.
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

/**
 * Reserva lista para pintarse: acciones ya decididas en el servidor,
 * posición en la columna e importe formateado.
 *
 * El importe llega formateado para que el bloque (Client Component) no
 * tenga que importar helpers de formato del lado servidor.
 */
export interface PositionedRow {
  row: BookingActionRow;
  /** Offset desde la primera hora visible, en píxeles (1 h = 60 px). */
  topPx: number;
  /** Altura del bloque en píxeles, según la duración. */
  heightPx: number;
  priceLabel: string;
}

/** Cabecera de un día de la semana mostrada. */
export interface CalendarDay {
  key: WeekdayKey;
  /** Fecha civil en Madrid (`YYYY-MM-DD`). */
  dateKey: string;
  dayOfMonth: number;
  isToday: boolean;
}

/**
 * Datos de navegación entre semanas. Las semanas se identifican por la
 * clave de su lunes, que es lo que viaja en `?semana=`.
 */
export interface CalendarWeekNav {
  startLabel: string;
  endLabel: string;
  previousWeek: string;
  nextWeek: string;
  currentWeek: string;
  isCurrentWeek: boolean;
}

/** Semana ya resuelta que la página entrega al calendario. */
export interface CalendarWeek {
  days: CalendarDay[];
  nav: CalendarWeekNav;
}

/** Props del componente WeeklyCalendar. */
export interface WeeklyCalendarProps {
  bookings: PanelBookingAction[];
  week: CalendarWeek;
  locale: SupportedLocale;
  /** Modo preview: acciones deshabilitadas y sin navegación. */
  readOnly: boolean;
  /** Momento de referencia para la ventana de 2 h (inyectable en tests). */
  now?: Date;
}

/** Props compartidas por las vistas que pintan columnas de día. */
export interface CalendarColumnsProps {
  days: CalendarDay[];
  grouped: Record<WeekdayKey, PositionedRow[]>;
  hours: number[];
  locale: SupportedLocale;
  readOnly: boolean;
}

/**
 * Mapeo entre estado de reserva y clases visuales del bloque.
 * Se exporta para facilitar el render de la leyenda en otros lugares.
 */
export type BookingStatusClassMap = Record<PanelBookingStatus, string>;
