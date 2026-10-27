'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { BookingCancelButton, BookingCompleteButton } from '../BookingActionsList';
import { bookingActionDialogStyles as d } from '../BookingActionsList/BookingActionsList.styles';
import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import { WEEKDAY_KEYS, toBlockStatus } from './WeeklyCalendar.logic';
import {
  bookingBlockByStatus,
  bookingDetailStyles as ds,
  weeklyCalendarStyles as s,
} from './WeeklyCalendar.styles';
import type { PositionedRow } from './WeeklyCalendar.types';

interface CalendarBookingBlockProps {
  positioned: PositionedRow;
  locale: SupportedLocale;
  readOnly: boolean;
  /** Distingue el bloque de escritorio del de móvil en `data-component`. */
  variant: 'week' | 'day';
}

/**
 * Bloque de una reserva en el calendario. Al tocarlo abre su detalle
 * con las acciones del proveedor (finalizar, cancelar), las mismas que
 * el listado: los permisos y la ventana de 2 h llegan ya resueltos del
 * servidor en `row` y el servidor los vuelve a comprobar al ejecutar.
 *
 * Tras una acción, `revalidatePath` re-renderiza la página; el diálogo
 * sigue abierto y muestra el estado nuevo, que es la confirmación.
 */
export function CalendarBookingBlock({
  positioned,
  locale,
  readOnly,
  variant,
}: CalendarBookingBlockProps) {
  const t = useTranslations('providerPanel.calendar');
  const { row, topPx, heightPx, priceLabel } = positioned;
  const { booking, canComplete, showCancel, cancellable } = row;
  const suffix = variant === 'day' ? '-day' : '';
  const hasActions = canComplete || showCancel;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`${s.bookingBlock} ${bookingBlockByStatus[toBlockStatus(booking.status)]}`}
          style={{ top: `${topPx}px`, height: `${heightPx}px` }}
          aria-label={t('bookingAriaLabel', {
            service: booking.serviceName,
            client: booking.clientName,
            time: booking.startTime,
          })}
          data-component={`weekly-calendar-booking-${booking.id}${suffix}`}
          data-status={booking.status}
        >
          <span className={s.bookingTitle}>{booking.serviceName}</span>
          <span className={s.bookingMeta}>
            {booking.startTime} · {booking.clientName}
          </span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={d.overlay} />
        <Dialog.Content
          className={d.content}
          data-component={`weekly-calendar-detail-${booking.id}`}
        >
          <div className={ds.header}>
            <Dialog.Title className={d.title}>{booking.serviceName}</Dialog.Title>
            <Dialog.Close className={ds.close} aria-label={t('details.close')}>
              <X className={ds.closeIcon} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className={ds.srOnly}>{t('details.description')}</Dialog.Description>

          <dl className={ds.list}>
            <dt className={ds.term}>{t('details.when')}</dt>
            <dd className={ds.value}>
              {t(`weekdays.${WEEKDAY_KEYS[booking.weekday]}`)} · {booking.startTime}–
              {booking.endTime}
            </dd>
            <dt className={ds.term}>{t('details.client')}</dt>
            <dd className={ds.value}>{booking.clientName}</dd>
            {booking.professionalName && (
              <>
                <dt className={ds.term}>{t('details.professional')}</dt>
                <dd className={ds.value}>{booking.professionalName}</dd>
              </>
            )}
            <dt className={ds.term}>{t('details.price')}</dt>
            <dd className={ds.value}>{priceLabel}</dd>
            <dt className={ds.term}>{t('details.status')}</dt>
            <dd className={ds.value} data-component={`weekly-calendar-detail-status-${booking.id}`}>
              {t(`status.${booking.status}`)}
            </dd>
          </dl>

          {hasActions ? (
            <div className={ds.actions}>
              {canComplete && (
                <BookingCompleteButton locale={locale} bookingId={booking.id} disabled={readOnly} />
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
          ) : (
            <p className={ds.noActions}>{t('details.noActions')}</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
