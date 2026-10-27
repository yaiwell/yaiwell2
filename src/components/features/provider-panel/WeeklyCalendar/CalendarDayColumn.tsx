import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import { CalendarBookingBlock } from './CalendarBookingBlock';
import { HOUR_HEIGHT_PX } from './WeeklyCalendar.logic';
import { weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import type { PositionedRow } from './WeeklyCalendar.types';

interface CalendarDayColumnProps {
  positioned: PositionedRow[];
  hours: number[];
  locale: SupportedLocale;
  readOnly: boolean;
  variant: 'week' | 'day';
}

/**
 * Columna de un día: separadores horarios y bloques de reserva.
 *
 * Sin estado ni hooks, así que sirve tanto dentro de la cuadrícula
 * (Server Component) como en la vista de día móvil (Client Component).
 */
export function CalendarDayColumn({
  positioned,
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
      {positioned.map((item) => (
        <CalendarBookingBlock
          key={item.row.booking.id}
          positioned={item}
          locale={locale}
          readOnly={readOnly}
          variant={variant}
        />
      ))}
    </div>
  );
}
