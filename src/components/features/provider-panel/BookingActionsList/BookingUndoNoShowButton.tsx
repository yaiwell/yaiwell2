'use client';

import { Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { undoNoShowAction } from '@/app/[locale]/panel/calendario/actions';
import { Button } from '@/components/ui/button';

import { bookingActionDialogStyles as d } from './BookingActionsList.styles';
import type { SupportedLocale } from './BookingActionsList.types';
import { undoNoShowErrorKey, type UndoNoShowErrorKey } from './BookingNoShow.logic';

interface BookingUndoNoShowButtonProps {
  locale: SupportedLocale;
  bookingId: string;
  /** En modo preview el botón se muestra pero no ejecuta nada. */
  disabled?: boolean;
}

/**
 * «Deshacer» un no presentado, solo durante las 24 h siguientes a
 * marcarlo (después, soporte). Retira la sanción si la había; si ya
 * pasaron 72 h desde la cita, la reserva queda finalizada.
 */
export function BookingUndoNoShowButton({
  locale,
  bookingId,
  disabled = false,
}: BookingUndoNoShowButtonProps) {
  const t = useTranslations('providerPanel.calendar.actions.undoNoShow');
  const [open, setOpen] = useState(false);
  const [errorKey, setErrorKey] = useState<UndoNoShowErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setErrorKey(null);
    startTransition(async () => {
      const result = await undoNoShowAction(locale, bookingId);
      if (result.ok) {
        setOpen(false);
        return;
      }
      setErrorKey(undoNoShowErrorKey(result.code));
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) setErrorKey(null);
    setOpen(next);
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          title={t('hint')}
          data-component={`booking-actions-undo-no-show-${bookingId}`}
        >
          <Undo2 className="size-3.5" aria-hidden />
          {t('button')}
        </Button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className={d.overlay} />
        <AlertDialog.Content
          className={d.content}
          data-component={`booking-actions-undo-no-show-dialog-${bookingId}`}
        >
          <AlertDialog.Title className={d.title}>{t('confirmTitle')}</AlertDialog.Title>
          <AlertDialog.Description className={d.description}>
            {t('confirmDescription')}
          </AlertDialog.Description>

          {errorKey && (
            <p role="alert" className={d.errorBanner}>
              {t(`errors.${errorKey}`)}
            </p>
          )}

          <div className={d.actions}>
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" size="sm" disabled={isPending}>
                {t('cancel')}
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleConfirm}
              data-component={`booking-actions-undo-no-show-confirm-${bookingId}`}
            >
              {isPending ? t('pending') : t('confirmAction')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
