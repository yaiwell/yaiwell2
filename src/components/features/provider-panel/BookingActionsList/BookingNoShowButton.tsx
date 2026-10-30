'use client';

import { UserX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { markNoShowAction } from '@/app/[locale]/panel/calendario/actions';
import { Button } from '@/components/ui/button';

import { bookingActionDialogStyles as d } from './BookingActionsList.styles';
import type { SupportedLocale } from './BookingActionsList.types';
import { markNoShowErrorKey, type MarkNoShowErrorKey } from './BookingNoShow.logic';

interface BookingNoShowButtonProps {
  locale: SupportedLocale;
  bookingId: string;
  /** Cambia lo que cuenta el diálogo: sanción en el local, sin devolución online. */
  isOnsite: boolean;
  /** En modo preview el botón se muestra pero no ejecuta nada. */
  disabled?: boolean;
}

/**
 * «No se presentó» desde el panel (§4.bis, decidido 2026-10-29). El
 * diálogo dice la consecuencia antes de confirmar: en el local, 1 sanción
 * al cliente y sin comisión; online, sin devolución ni sanción. Se puede
 * deshacer durante 24 h.
 */
export function BookingNoShowButton({
  locale,
  bookingId,
  isOnsite,
  disabled = false,
}: BookingNoShowButtonProps) {
  const t = useTranslations('providerPanel.calendar.actions.noShow');
  const [open, setOpen] = useState(false);
  const [errorKey, setErrorKey] = useState<MarkNoShowErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setErrorKey(null);
    startTransition(async () => {
      const result = await markNoShowAction(locale, bookingId);
      if (result.ok) {
        // Tras el revalidate la fila llega con «Deshacer» en su lugar.
        setOpen(false);
        return;
      }
      setErrorKey(markNoShowErrorKey(result.code));
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
          variant="outline"
          size="sm"
          disabled={disabled}
          data-component={`booking-actions-no-show-${bookingId}`}
        >
          <UserX className="size-3.5" aria-hidden />
          {t('button')}
        </Button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className={d.overlay} />
        <AlertDialog.Content
          className={d.content}
          data-component={`booking-actions-no-show-dialog-${bookingId}`}
        >
          <AlertDialog.Title className={d.title}>{t('confirmTitle')}</AlertDialog.Title>
          <AlertDialog.Description className={d.description}>
            {isOnsite ? t('descriptionOnsite') : t('descriptionOnline')}
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
            {/* Sin AlertDialog.Action: si la action falla, el diálogo sigue abierto. */}
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleConfirm}
              data-component={`booking-actions-no-show-confirm-${bookingId}`}
            >
              {isPending ? t('pending') : t('confirmAction')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
