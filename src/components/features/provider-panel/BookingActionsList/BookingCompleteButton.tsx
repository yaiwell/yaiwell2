'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { completeBookingAction } from '@/app/[locale]/panel/calendario/actions';
import { Button } from '@/components/ui/button';

import { bookingActionDialogStyles as d } from './BookingActionsList.styles';
import type { SupportedLocale } from './BookingActionsList.types';

interface BookingCompleteButtonProps {
  locale: SupportedLocale;
  bookingId: string;
  /** En modo preview el botón se muestra pero no ejecuta nada. */
  disabled?: boolean;
}

/**
 * Marca una reserva como finalizada desde el panel.
 *
 * Es la acción que cierra el ciclo: sin ella ninguna reserva llega a
 * `completed` y el cliente nunca puede valorar (§4.bis de CLAUDE.md).
 * Por eso el diálogo avisa de las dos consecuencias —se habilita la
 * valoración y no hay vuelta atrás— antes de confirmar.
 *
 * El icono Lucide se renderiza dentro de este Client Component y no se
 * pasa como prop desde el Server Component padre: son `forwardRef` no
 * serializables a través de la frontera RSC.
 */
export function BookingCompleteButton({
  locale,
  bookingId,
  disabled = false,
}: BookingCompleteButtonProps) {
  const t = useTranslations('providerPanel.calendar.actions.complete');
  const [open, setOpen] = useState(false);
  const [errorCode, setErrorCode] = useState<
    'notFound' | 'forbidden' | 'notConfirmed' | 'internal' | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setErrorCode(null);
    startTransition(async () => {
      const result = await completeBookingAction(locale, bookingId);
      if (result.ok) {
        // Cerramos solo en éxito; tras el revalidate el servidor
        // re-rendea la fila ya sin este botón.
        setOpen(false);
        return;
      }
      switch (result.code) {
        case 'NOT_FOUND':
          setErrorCode('notFound');
          break;
        case 'FORBIDDEN':
          setErrorCode('forbidden');
          break;
        case 'NOT_CONFIRMED':
          setErrorCode('notConfirmed');
          break;
        default:
          setErrorCode('internal');
      }
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setErrorCode(null);
    }
    setOpen(next);
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          data-component={`booking-actions-complete-${bookingId}`}
        >
          <CheckCircle2 className="size-3.5" aria-hidden />
          {t('button')}
        </Button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className={d.overlay} />
        <AlertDialog.Content
          className={d.content}
          data-component={`booking-actions-complete-dialog-${bookingId}`}
        >
          <AlertDialog.Title className={d.title}>{t('confirmTitle')}</AlertDialog.Title>
          <AlertDialog.Description className={d.description}>
            {t('confirmDescription')}
          </AlertDialog.Description>

          {errorCode && (
            <p
              role="alert"
              className={d.errorBanner}
              data-component={`booking-actions-complete-error-${bookingId}`}
            >
              {t(`errors.${errorCode}`)}
            </p>
          )}

          <div className={d.actions}>
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" size="sm" disabled={isPending}>
                {t('cancel')}
              </Button>
            </AlertDialog.Cancel>
            {/*
              No usamos AlertDialog.Action: cierra el diálogo al click y
              necesitamos mantenerlo abierto si la action falla.
            */}
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={handleConfirm}
              data-component={`booking-actions-complete-confirm-${bookingId}`}
            >
              {isPending ? t('pending') : t('confirmAction')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
