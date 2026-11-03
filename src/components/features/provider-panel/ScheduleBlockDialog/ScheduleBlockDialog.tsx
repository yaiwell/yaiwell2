'use client';

import { CalendarOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { Button } from '@/components/ui/button';

import { bookingActionDialogStyles as d } from '../BookingActionsList/BookingActionsList.styles';
import { useScheduleBlockDialog } from './ScheduleBlockDialog.logic';
import { scheduleBlockDialogStyles as s } from './ScheduleBlockDialog.styles';
import type { ScheduleBlockDialogProps } from './ScheduleBlockDialog.types';
import { ScheduleBlockForm } from './ScheduleBlockForm';

/**
 * Botón «Bloquear horas» de la cabecera del calendario y su diálogo.
 *
 * El formulario se monta con `key` por apertura: cada vez arranca con
 * los valores por defecto del momento y sin errores de la vez anterior.
 */
export function ScheduleBlockDialog({ locale, now }: ScheduleBlockDialogProps) {
  const t = useTranslations('providerPanel.calendar.scheduleBlocks');
  const { open, openedAt, formKey, handleOpenChange, close } = useScheduleBlockDialog(now);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={s.trigger}
          data-component="schedule-block-open"
        >
          <CalendarOff className={s.triggerIcon} aria-hidden />
          {t('openButton')}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={d.overlay} />
        <Dialog.Content
          className={`${d.content} ${s.content}`}
          data-component="schedule-block-dialog"
        >
          {open && (
            <ScheduleBlockForm key={formKey} locale={locale} now={openedAt} onClose={close} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
