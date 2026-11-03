import type { SlotOfferDiscounts } from '@/lib/utils/slot-offer-pricing';

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
 * `'no_show'` sí tiene color propio: la franja estaba reservada y el
 * cliente no vino, que no es lo mismo que una hora que quedó libre.
 */
export type PanelBookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';

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
  /** Profesional de ejemplo (para enseñar el filtro y los carriles). */
  professionalId?: string | null;
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
  /** Carril dentro de la columna si se solapa con otros elementos. */
  lane?: LaneSlot;
}

/**
 * Hueco liberado con descuento y todavía sin vender, tal y como lo
 * pinta el calendario. El % y el precio vigentes se calculan en el
 * servidor en el momento del render.
 */
export interface PanelSlotOffer {
  id: string;
  /** Inicio en ISO-8601 UTC; `null` en los ejemplos del modo preview. */
  startAtIso: string | null;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  serviceName: string;
  /** Profesional cuyo hueco es (filtro por profesional del calendario). */
  professionalId?: string | null;
  professionalName: string | null;
  discounts: SlotOfferDiscounts;
  /** % que se aplicaría a quien reserve ahora (0 si el tramo vigente no rebaja). */
  currentDiscountPct: number;
  /** Precio de referencia: el vigente del servicio, nunca uno inflado. */
  priceCents: number;
  /** Precio que pagaría quien reserve ahora. */
  currentPriceCents: number;
}

/** Oferta lista para pintarse en una columna del calendario. */
export interface PositionedOffer {
  offer: PanelSlotOffer;
  topPx: number;
  heightPx: number;
  priceLabel: string;
  currentPriceLabel: string;
  /**
   * Carril dentro de la columna: si pisa una reserva (la cancelada de la
   * que nace, por ejemplo) u otro elemento, se pintan uno al lado del
   * otro para que todos sigan visibles y tocables.
   */
  lane?: LaneSlot;
}

/**
 * Tramo de un bloqueo puntual de agenda dentro de un día civil de
 * Madrid. Un bloqueo que cruza medianoche llega troceado en varios
 * tramos (uno por día) con el mismo `id` y distinto `segmentKey`.
 *
 * El motivo es privado: solo lo ve el negocio en su panel.
 */
export interface PanelScheduleBlock {
  /** Id del bloqueo completo (el que se envía al quitarlo). */
  id: string;
  /** Clave única del tramo (`<id>:<YYYY-MM-DD>`), para las `key` de React. */
  segmentKey: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Inicio del tramo en el día (`HH:mm`, `00:00` si viene del día anterior). */
  startTime: string;
  /** Fin del tramo en el día (`HH:mm`, `24:00` si sigue al día siguiente). */
  endTime: string;
  reason: string | null;
  /** Profesional bloqueado (cada bloqueo es de un profesional). */
  professionalId?: string | null;
  professionalName?: string | null;
  /** Inicio del bloqueo completo en ISO-8601 UTC; `null` en el modo preview. */
  startAtIso: string | null;
  /** Fin del bloqueo completo en ISO-8601 UTC; `null` en el modo preview. */
  endAtIso: string | null;
  /** El tramo cubre el día civil entero (de 00:00 a 24:00). */
  isFullDay: boolean;
}

/** Tramo de bloqueo listo para pintarse, ya recortado a las horas visibles. */
export interface PositionedScheduleBlock {
  block: PanelScheduleBlock;
  topPx: number;
  heightPx: number;
  lane?: LaneSlot;
}

/**
 * Carril de un elemento dentro de su columna de día: `lane` empieza en
 * 0 y `laneCount` es cuántos carriles necesita su grupo de solapes.
 */
export interface LaneSlot {
  lane: number;
  laneCount: number;
}

/** Profesional activo del negocio, para el filtro y el diálogo de bloqueo. */
export interface PanelTeamMember {
  id: string;
  name: string;
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
  /** Lunes de la semana mostrada (`YYYY-MM-DD`). */
  weekKey: string;
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
  /** Huecos liberados sin vender de la semana visible. */
  slotOffers?: PanelSlotOffer[];
  /** Tramos de bloqueos puntuales de agenda de la semana visible. */
  scheduleBlocks?: PanelScheduleBlock[];
  week: CalendarWeek;
  locale: SupportedLocale;
  /** Modo preview: acciones deshabilitadas y sin navegación. */
  readOnly: boolean;
  /** Momento de referencia para la ventana de 2 h (inyectable en tests). */
  now?: Date;
  /** Equipo activo; con más de un profesional se enseña el filtro. */
  team?: PanelTeamMember[];
  /** Profesional del filtro `?pro=`; `null` = todos. */
  selectedProfessionalId?: string | null;
}

/** Props compartidas por las vistas que pintan columnas de día. */
export interface CalendarColumnsProps {
  days: CalendarDay[];
  grouped: Record<WeekdayKey, PositionedRow[]>;
  groupedOffers: Record<WeekdayKey, PositionedOffer[]>;
  groupedBlocks: Record<WeekdayKey, PositionedScheduleBlock[]>;
  hours: number[];
  locale: SupportedLocale;
  readOnly: boolean;
  /** Pinta el nombre del profesional en cada bloque (vista «Todos»). */
  showProfessional: boolean;
}

/**
 * Mapeo entre estado de reserva y clases visuales del bloque.
 * Se exporta para facilitar el render de la leyenda en otros lugares.
 */
export type BookingStatusClassMap = Record<PanelBookingStatus, string>;
