import { CalendarClock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatCurrencyFromCents } from '../DashboardMetrics/DashboardMetrics.logic';
import { buildBookingActionRows } from './BookingActionsList.logic';
import { bookingActionsListStyles as s } from './BookingActionsList.styles';
import type { BookingActionsListProps, PanelBookingActionStatus } from './BookingActionsList.types';
import { BookingCancelButton } from './BookingCancelButton';
import { BookingCompleteButton } from './BookingCompleteButton';

/** Claves de día del namespace `providerPanel.calendar.weekdays`. */
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Clase visual de cada estado, para no ramificar dentro del JSX. */
const STATUS_CLASSES: Record<PanelBookingActionStatus, string> = {
  pending: s.statusPending,
  confirmed: s.statusConfirmed,
  completed: s.statusCompleted,
  cancelled: s.statusCancelled,
  refunded: s.statusRefunded,
};

/**
 * Listado de reservas de la semana con sus acciones de proveedor.
 *
 * Server Component: las dos decisiones que dependen del reloj
 * (`canComplete`, `cancellable`) se resuelven aquí, y solo los botones
 * —que necesitan estado y diálogo— cruzan a cliente.
 *
 * Incluye también las reservas ya resueltas de la semana: tras cancelar
 * o finalizar, la fila permanece con su nuevo estado en lugar de
 * desaparecer, que es lo que confirma al proveedor que la acción ha
 * surtido efecto (y si el reembolso ya salió).
 */
export function BookingActionsList({ bookings, locale, readOnly, now }: BookingActionsListProps) {
  const t = useTranslations('providerPanel.calendar');
  const rows = buildBookingActionRows(bookings, now);

  return (
    <section className={s.root} data-component="booking-actions-list">
      <header className={s.header}>
        <h2 className={s.title}>{t('actions.title')}</h2>
        <p className={s.subtitle}>{t('actions.subtitle')}</p>
      </header>

      {readOnly && (
        <p className={s.readOnlyNotice} data-component="booking-actions-list-readonly">
          {t('actions.readOnlyHint')}
        </p>
      )}

      {rows.length === 0 ? (
        <p className={s.empty} data-component="booking-actions-list-empty">
          {t('actions.empty')}
        </p>
      ) : (
        <ul className={s.list}>
          {rows.map(({ booking, canComplete, showCancel, cancellable }) => (
            <li
              key={booking.id}
              className={s.card}
              data-component={`booking-actions-item-${booking.id}`}
              data-status={booking.status}
            >
              <div className={s.cardMain}>
                <p className={s.cardWhen}>
                  <CalendarClock className={s.cardWhenIcon} aria-hidden />
                  {t(`weekdays.${WEEKDAY_KEYS[booking.weekday]}`)} · {booking.startTime}–
                  {booking.endTime}
                  <span className={`${s.statusChip} ${STATUS_CLASSES[booking.status]}`}>
                    {t(`status.${booking.status}`)}
                  </span>
                </p>
                <p className={s.cardService}>{booking.serviceName}</p>
                <p className={s.cardMeta}>
                  {booking.professionalName
                    ? t('actions.clientWithProfessional', {
                        client: booking.clientName,
                        professional: booking.professionalName,
                      })
                    : booking.clientName}
                </p>
              </div>

              <div className={s.cardAside}>
                <span className={s.cardPrice}>
                  {formatCurrencyFromCents(booking.priceCents, locale)}
                </span>
                <div className={s.cardActions}>
                  {canComplete && (
                    <BookingCompleteButton
                      locale={locale}
                      bookingId={booking.id}
                      disabled={readOnly}
                    />
                  )}
                  {showCancel && (
                    <BookingCancelButton
                      locale={locale}
                      bookingId={booking.id}
                      startAtIso={booking.startAtIso}
                      initialCancellable={cancellable}
                      disabled={readOnly}
                    />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
