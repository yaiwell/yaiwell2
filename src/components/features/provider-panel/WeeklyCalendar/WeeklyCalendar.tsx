import { useTranslations } from 'next-intl';

import {
  WEEKDAY_KEYS,
  formatHourLabel,
  getHoursRange,
  groupBookingsByWeekday,
} from './WeeklyCalendar.logic';
import type { PanelBookingStatus } from './WeeklyCalendar.types';
import {
  bookingBlockByStatus,
  legendDotByStatus,
  weeklyCalendarStyles as s,
} from './WeeklyCalendar.styles';
import type { WeeklyCalendarProps } from './WeeklyCalendar.types';

/** Estados que se muestran en la leyenda (orden visible). */
const LEGEND_STATUSES: PanelBookingStatus[] = ['confirmed', 'pending', 'completed', 'cancelled'];

/**
 * Calendario semanal del panel del proveedor.
 *
 * Renderiza una cuadrícula de 7 días con franjas horarias y bloques
 * absolutos que representan cada reserva. La altura de cada bloque es
 * proporcional a la duración del servicio (1h = 60px).
 *
 * Server Component puro: las reservas vienen ya posicionadas a través de
 * `groupBookingsByWeekday`, y el componente solo compone la UI.
 */
export function WeeklyCalendar({ bookings }: WeeklyCalendarProps) {
  const t = useTranslations('providerPanel.calendar');
  const grouped = groupBookingsByWeekday(bookings);
  const hours = getHoursRange();

  return (
    <div className={s.root} data-component="weekly-calendar">
      <header className={s.header}>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
        <p className={s.summary}>{t('summary', { count: bookings.length })}</p>
      </header>

      <div className={s.scroll}>
        <div className={s.grid}>
          {/* Cabecera con día de la semana */}
          <div className={s.headerRow} role="row">
            <div className={s.headerCell} aria-hidden />
            {WEEKDAY_KEYS.map((dayKey) => (
              <div
                key={dayKey}
                role="columnheader"
                className={`${s.headerCell} ${s.headerCellDay}`}
                data-component={`weekly-calendar-header-${dayKey}`}
              >
                {t(`weekdayShort.${dayKey}`)}
              </div>
            ))}
          </div>

          {/* Cuerpo: columna de horas + 7 columnas de días */}
          <div className={s.body}>
            <div className={s.hourColumn} aria-hidden>
              {hours.map((h) => (
                <span key={h} className={s.hourCell}>
                  {formatHourLabel(h)}
                </span>
              ))}
            </div>

            {WEEKDAY_KEYS.map((dayKey) => (
              <div
                key={dayKey}
                className={s.dayColumn}
                data-component={`weekly-calendar-day-${dayKey}`}
              >
                <div className={s.dayInner}>
                  {/* Separadores horarios para guiar visualmente al usuario */}
                  {hours.map((_, index) => (
                    <span
                      key={index}
                      className={s.hourSeparator}
                      style={{ top: `${index * 60}px` }}
                      aria-hidden
                    />
                  ))}

                  {grouped[dayKey].map(({ booking, topPx, heightPx }) => (
                    <article
                      key={booking.id}
                      className={`${s.bookingBlock} ${bookingBlockByStatus[booking.status]}`}
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                      aria-label={t('bookingAriaLabel', {
                        service: booking.serviceName,
                        client: booking.clientName,
                        time: booking.startTime,
                      })}
                      data-component={`weekly-calendar-booking-${booking.id}`}
                      data-status={booking.status}
                    >
                      <p className={s.bookingTitle}>{booking.serviceName}</p>
                      <p className={s.bookingMeta}>
                        {booking.startTime} · {booking.clientName}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={s.legend} data-component="weekly-calendar-legend">
        <span className={s.legendTitle}>{t('legend')}:</span>
        {LEGEND_STATUSES.map((status) => (
          <span key={status} className={s.legendChip}>
            <span className={`${s.legendDot} ${legendDotByStatus[status]}`} aria-hidden />
            {t(`status.${status}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
