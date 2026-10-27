'use client';

import { useTranslations } from 'next-intl';

import { CalendarDayColumn } from './CalendarDayColumn';
import { useSelectedDay } from './CalendarDayView.logic';
import { formatHourLabel } from './WeeklyCalendar.logic';
import { weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import type { CalendarColumnsProps } from './WeeklyCalendar.types';

interface CalendarDayViewProps extends CalendarColumnsProps {
  initialDayIndex: number;
}

/**
 * Vista de un solo día para móvil: pestañas con los 7 días y debajo la
 * columna del día elegido a todo el ancho, con bloques legibles y
 * fáciles de tocar.
 */
export function CalendarDayView({
  days,
  grouped,
  hours,
  locale,
  readOnly,
  initialDayIndex,
}: CalendarDayViewProps) {
  const t = useTranslations('providerPanel.calendar');
  const { selected, setSelected, tabRefs, handleKeyDown } = useSelectedDay(
    initialDayIndex,
    days.length,
  );
  const day = days[selected];
  const positioned = grouped[day.key];

  return (
    <div className={s.mobile} data-component="weekly-calendar-day-view">
      <div role="tablist" aria-label={t('dayView.tabsLabel')} className={s.tabList}>
        {days.map((d, index) => {
          const isSelected = index === selected;
          const count = grouped[d.key].length;
          return (
            <button
              key={d.dateKey}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`calendar-day-tab-${d.dateKey}`}
              aria-selected={isSelected}
              aria-controls="calendar-day-panel"
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={handleKeyDown}
              className={`${s.tab} ${isSelected ? s.tabSelected : ''}`}
              data-component={`weekly-calendar-day-tab-${d.key}`}
            >
              {t(`weekdayShort.${d.key}`)}
              <span className={`${s.tabDate} ${d.isToday ? s.tabToday : ''}`}>{d.dayOfMonth}</span>
              <span className={count > 0 ? s.tabCount : s.tabCountEmpty} aria-hidden />
              {/* El recuento solo para lectores de pantalla: así el nombre
                  accesible empieza por el texto visible (WCAG 2.5.3). */}
              <span className={s.srOnly}>{t('dayView.tabCount', { count })}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="calendar-day-panel"
        aria-labelledby={`calendar-day-tab-${day.dateKey}`}
        tabIndex={0}
      >
        {positioned.length === 0 ? (
          <p className={s.dayEmpty} data-component="weekly-calendar-day-empty">
            {t('emptyDay')}
          </p>
        ) : (
          <div className={s.dayPanel}>
            <div className={s.hourColumn} aria-hidden>
              {hours.map((h) => (
                <span key={h} className={s.hourCell}>
                  {formatHourLabel(h)}
                </span>
              ))}
            </div>
            <div className={s.dayColumn}>
              <CalendarDayColumn
                positioned={positioned}
                hours={hours}
                locale={locale}
                readOnly={readOnly}
                variant="day"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
