import { useTranslations } from 'next-intl';

import { buildBookingActionRows } from '../BookingActionsList/BookingActionsList.logic';
import { formatCurrencyFromCents } from '../DashboardMetrics/DashboardMetrics.logic';
import { CalendarDayColumn } from './CalendarDayColumn';
import { CalendarDayView } from './CalendarDayView';
import {
  formatHourLabel,
  getHoursRange,
  getInitialDayIndex,
  groupRowsByWeekday,
} from './WeeklyCalendar.logic';
import { groupOffersByWeekday } from './WeeklyCalendar.offers';
import { legendDotByStatus, weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import { WeekNavigation } from './WeekNavigation';
import type { PanelBookingStatus, WeeklyCalendarProps } from './WeeklyCalendar.types';

/** Estados que se muestran en la leyenda (orden visible). */
const LEGEND_STATUSES: PanelBookingStatus[] = ['confirmed', 'pending', 'completed', 'cancelled'];

/**
 * Calendario semanal del panel del proveedor.
 *
 * Server Component: decide en el servidor las acciones de cada reserva
 * (`buildBookingActionRows`, mismo criterio que el listado) y su
 * posición. Solo cruzan a cliente los bloques (abren el detalle) y la
 * vista de día móvil (pestañas).
 *
 * Los huecos liberados con descuento sin vender se pintan como bloques
 * discontinuos con el % vigente y su opción de retirarlos.
 *
 * Cuadrícula de 7 días desde `md`; por debajo, vista de un día.
 */
export function WeeklyCalendar({
  bookings,
  slotOffers = [],
  week,
  locale,
  readOnly,
  now,
}: WeeklyCalendarProps) {
  const t = useTranslations('providerPanel.calendar');
  const rows = buildBookingActionRows(bookings, now);
  const hours = getHoursRange(rows, slotOffers);
  const formatPrice = (cents: number) => formatCurrencyFromCents(cents, locale);
  const grouped = groupRowsByWeekday(rows, hours[0], formatPrice);
  const groupedOffers = groupOffersByWeekday(slotOffers, hours[0], grouped, formatPrice);
  const { days, nav } = week;

  return (
    <div className={s.root} data-component="weekly-calendar">
      <div className={s.toolbar}>
        {readOnly ? null : <WeekNavigation nav={nav} />}
        <p className={s.summary} data-component="weekly-calendar-summary">
          {t('summary', { count: bookings.length })}
        </p>
      </div>

      <div className={s.desktop}>
        <div className={s.scroll}>
          <div className={s.grid}>
            <div className={s.headerRow}>
              <div className={s.headerCell} aria-hidden />
              {days.map((day) => (
                <div
                  key={day.dateKey}
                  className={`${s.headerCell} ${s.headerCellDay} ${day.isToday ? s.headerToday : ''}`}
                  data-component={`weekly-calendar-header-${day.key}`}
                  aria-current={day.isToday ? 'date' : undefined}
                >
                  {t(`weekdayShort.${day.key}`)}
                  <span className={`${s.headerDate} ${day.isToday ? s.todayDot : ''}`}>
                    {day.dayOfMonth}
                  </span>
                </div>
              ))}
            </div>

            <div className={s.body}>
              <div className={s.hourColumn} aria-hidden>
                {hours.map((h) => (
                  <span key={h} className={s.hourCell}>
                    {formatHourLabel(h)}
                  </span>
                ))}
              </div>

              {days.map((day) => (
                <div
                  key={day.dateKey}
                  className={`${s.dayColumn} ${day.isToday ? s.dayColumnToday : ''}`}
                  data-component={`weekly-calendar-day-${day.key}`}
                >
                  <CalendarDayColumn
                    positioned={grouped[day.key]}
                    offers={groupedOffers[day.key]}
                    hours={hours}
                    locale={locale}
                    readOnly={readOnly}
                    variant="week"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CalendarDayView
        days={days}
        grouped={grouped}
        groupedOffers={groupedOffers}
        hours={hours}
        locale={locale}
        readOnly={readOnly}
        initialDayIndex={getInitialDayIndex(days, grouped)}
      />

      <div className={s.legend} data-component="weekly-calendar-legend">
        <span className={s.legendTitle}>{t('legend')}:</span>
        {LEGEND_STATUSES.map((status) => (
          <span key={status} className={s.legendChip}>
            <span className={`${s.legendDot} ${legendDotByStatus[status]}`} aria-hidden />
            {t(`status.${status}`)}
          </span>
        ))}
        <span className={s.legendChip}>
          <span className={s.legendDotOffer} aria-hidden />
          {t('slotOffers.block.legend')}
        </span>
      </div>
    </div>
  );
}
