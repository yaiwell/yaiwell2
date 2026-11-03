import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import { CalendarBookingBlock } from './CalendarBookingBlock';
import { CalendarOfferBlock } from './CalendarOfferBlock';
import { CalendarScheduleBlock } from './CalendarScheduleBlock';
import { HOUR_HEIGHT_PX } from './WeeklyCalendar.logic';
import { weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import type {
  PositionedOffer,
  PositionedRow,
  PositionedScheduleBlock,
} from './WeeklyCalendar.types';

interface CalendarDayColumnProps {
  positioned: PositionedRow[];
  /** Huecos liberados del día (bloques discontinuos). */
  offers?: PositionedOffer[];
  /** Tramos de bloqueos de agenda del día (fondo rayado). */
  blocks?: PositionedScheduleBlock[];
  hours: number[];
  locale: SupportedLocale;
  readOnly: boolean;
  /** Nombre del profesional en cada bloque (vista «Todos» con equipo). */
  showProfessional?: boolean;
  variant: 'week' | 'day';
}

/**
 * Columna de un día: separadores horarios, bloqueos de agenda, bloques
 * de reserva y huecos liberados con descuento.
 *
 * Lo que coincide en el tiempo llega con su carril (`lane`) y se pinta
 * lado a lado. Los bloqueos van primero en el DOM para quedar debajo
 * si aun así se tocan por el alto mínimo de un bloque.
 *
 * Sin estado ni hooks, así que sirve tanto dentro de la cuadrícula
 * (Server Component) como en la vista de día móvil (Client Component).
 */
export function CalendarDayColumn({
  positioned,
  offers = [],
  blocks = [],
  hours,
  locale,
  readOnly,
  showProfessional = false,
  variant,
}: CalendarDayColumnProps) {
  return (
    <div className={s.dayInner} style={{ height: `${hours.length * HOUR_HEIGHT_PX}px` }}>
      {hours.map((hour, index) => (
        <span
          key={hour}
          className={s.hourSeparator}
          style={{ top: `${index * HOUR_HEIGHT_PX}px` }}
          aria-hidden
        />
      ))}
      {blocks.map((item) => (
        <CalendarScheduleBlock
          key={item.block.segmentKey}
          positioned={item}
          locale={locale}
          readOnly={readOnly}
          showProfessional={showProfessional}
          variant={variant}
        />
      ))}
      {positioned.map((item) => (
        <CalendarBookingBlock
          key={item.row.booking.id}
          positioned={item}
          locale={locale}
          readOnly={readOnly}
          showProfessional={showProfessional}
          variant={variant}
        />
      ))}
      {offers.map((item) => (
        <CalendarOfferBlock
          key={item.offer.id}
          positioned={item}
          locale={locale}
          readOnly={readOnly}
          showProfessional={showProfessional}
          variant={variant}
        />
      ))}
    </div>
  );
}
