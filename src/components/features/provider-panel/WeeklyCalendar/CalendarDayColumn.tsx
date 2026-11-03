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
  variant: 'week' | 'day';
}

/**
 * Columna de un día: separadores horarios, bloqueos de agenda, bloques
 * de reserva y huecos liberados con descuento.
 *
 * Los bloqueos se pintan primero para quedar debajo: una reserva que
 * coincida (p. ej. una cancelada que sigue en la rejilla) sigue siendo
 * visible y tocable.
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
          variant={variant}
        />
      ))}
      {positioned.map((item) => (
        <CalendarBookingBlock
          key={item.row.booking.id}
          positioned={item}
          locale={locale}
          readOnly={readOnly}
          variant={variant}
        />
      ))}
      {offers.map((item) => (
        <CalendarOfferBlock
          key={item.offer.id}
          positioned={item}
          locale={locale}
          readOnly={readOnly}
          variant={variant}
        />
      ))}
    </div>
  );
}
