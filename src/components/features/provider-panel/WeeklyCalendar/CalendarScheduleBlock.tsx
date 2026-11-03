'use client';

import { Ban, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { Button } from '@/components/ui/button';

import { bookingActionDialogStyles as d } from '../BookingActionsList/BookingActionsList.styles';
import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import { formatBlockRange, useRemoveScheduleBlock } from './CalendarScheduleBlock.logic';
import { WEEKDAY_KEYS } from './WeeklyCalendar.logic';
import {
  bookingDetailStyles as ds,
  scheduleBlockStyles as bs,
  weeklyCalendarStyles as s,
} from './WeeklyCalendar.styles';
import type { PositionedScheduleBlock } from './WeeklyCalendar.types';

interface CalendarScheduleBlockProps {
  positioned: PositionedScheduleBlock;
  locale: SupportedLocale;
  readOnly: boolean;
  variant: 'week' | 'day';
}

/**
 * Tramo rayado de un bloqueo puntual de agenda: el negocio no está
 * disponible en esa franja. Se pinta debajo de reservas y huecos
 * liberados para no tapar nada tocable.
 *
 * Al tocarlo abre el detalle (rango completo y motivo privado) con
 * «Quitar bloqueo», que pide confirmación antes de llamar al servidor.
 */
export function CalendarScheduleBlock({
  positioned,
  locale,
  readOnly,
  variant,
}: CalendarScheduleBlockProps) {
  const t = useTranslations('providerPanel.calendar');
  const tb = useTranslations('providerPanel.calendar.scheduleBlocks');
  const { block, topPx, heightPx } = positioned;
  const remover = useRemoveScheduleBlock(locale, block.id);
  const time = block.isFullDay ? tb('fullDay') : `${block.startTime}–${block.endTime}`;
  const range =
    formatBlockRange(block.startAtIso, block.endAtIso, locale) ??
    `${t(`weekdays.${WEEKDAY_KEYS[block.weekday]}`)} · ${time}`;

  return (
    <Dialog.Root onOpenChange={(open) => (open ? undefined : remover.reset())}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={s.scheduleBlock}
          style={{ top: `${topPx}px`, height: `${heightPx}px` }}
          aria-label={tb('block.ariaLabel', { time })}
          data-component={`weekly-calendar-block-${block.segmentKey}${variant === 'day' ? '-day' : ''}`}
        >
          <span className={s.bookingTitle}>{tb('block.label')}</span>
          <span className={s.bookingMeta}>{block.reason ?? time}</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={d.overlay} />
        <Dialog.Content
          className={d.content}
          data-component={`weekly-calendar-block-detail-${block.id}`}
        >
          <div className={ds.header}>
            <Dialog.Title className={d.title}>{tb('detail.title')}</Dialog.Title>
            <Dialog.Close className={ds.close} aria-label={t('details.close')}>
              <X className={ds.closeIcon} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className={ds.srOnly}>{tb('detail.description')}</Dialog.Description>

          <dl className={ds.list}>
            <dt className={ds.term}>{t('details.when')}</dt>
            <dd className={ds.value}>{range}</dd>
            {block.reason && (
              <>
                <dt className={ds.term}>{tb('detail.reason')}</dt>
                <dd className={bs.reason}>{block.reason}</dd>
              </>
            )}
          </dl>
          <p className={ds.hint}>{tb('privateHint')}</p>

          {remover.errorKey && (
            <p role="alert" className={d.errorBanner}>
              {tb(`remove.errors.${remover.errorKey}`)}
            </p>
          )}

          {remover.removed ? (
            <p role="status" className={bs.removed} data-component="schedule-block-removed">
              {tb('remove.done')}
            </p>
          ) : remover.confirming ? (
            <div className={bs.confirm} data-component={`schedule-block-confirm-${block.id}`}>
              <p className={bs.confirmText}>{tb('remove.confirmText')}</p>
              <div className={d.actions}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={remover.isPending}
                  onClick={remover.cancelConfirmation}
                >
                  {tb('remove.keep')}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={remover.isPending}
                  onClick={remover.remove}
                  data-component={`schedule-block-remove-confirm-${block.id}`}
                >
                  {remover.isPending ? tb('remove.pending') : tb('remove.confirm')}
                </Button>
              </div>
            </div>
          ) : (
            <div className={ds.actions}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={readOnly}
                onClick={remover.askConfirmation}
                data-component={`schedule-block-remove-${block.id}`}
              >
                <Ban className={bs.icon} aria-hidden />
                {tb('remove.button')}
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
