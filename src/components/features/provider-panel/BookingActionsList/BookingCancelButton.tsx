'use client';

import { XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';
import { useState, useTransition } from 'react';

import { cancelBookingAction } from '@/app/[locale]/panel/calendario/actions';
import { useCancellationWindow } from '@/components/shared/CancellationWindow';
import { Button } from '@/components/ui/button';

import { useReleaseSlotPrompt } from '../ReleaseSlotDialog';
import {
  bookingActionDialogStyles as d,
  bookingActionsListStyles as s,
} from './BookingActionsList.styles';
import type { SupportedLocale } from './BookingActionsList.types';

interface BookingCancelButtonProps {
  locale: SupportedLocale;
  bookingId: string;
  /** Inicio de la reserva en ISO-8601; `null` en modo preview. */
  startAtIso: string | null;
  /** Veredicto del servidor sobre la ventana de 2 h en el primer render. */
  initialCancellable: boolean;
  /** En modo preview el botón se muestra pero no ejecuta nada. */
  disabled?: boolean;
}

/** Códigos de error que este botón sabe contar al proveedor. */
type CancelErrorCode =
  | 'notFound'
  | 'forbidden'
  | 'tooLate'
  | 'notCancellable'
  | 'refundFailed'
  | 'internal';

/**
 * Cancela una reserva desde el panel, con reembolso íntegro al cliente.
 *
 * Dos matices de producto que la UI debe respetar:
 *  - Por debajo de 2 h la cancelación queda bloqueada (§4.bis). El
 *    botón se deshabilita y explicamos que la excepción por fuerza
 *    mayor la gestiona soporte, no el self-service.
 *  - `refundFailed` no es un fracaso total: la reserva SÍ quedó
 *    cancelada. Se cuenta sin pedir al proveedor que reintente.
 *
 * Tras cancelar (con o sin reembolso), si el calendario monta el
 * diálogo de huecos liberados, se ofrece liberar el hueco con descuento
 * («Omitir» lo cierra). Sin ese contexto, el diálogo se cierra o se
 * queda abierto con el aviso del reembolso, como antes.
 */
export function BookingCancelButton({
  locale,
  bookingId,
  startAtIso,
  initialCancellable,
  disabled = false,
}: BookingCancelButtonProps) {
  const t = useTranslations('providerPanel.calendar.actions.cancel');
  const [open, setOpen] = useState(false);
  const [errorCode, setErrorCode] = useState<CancelErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();
  const cancellable = useCancellationWindow(startAtIso, initialCancellable);
  const openReleasePrompt = useReleaseSlotPrompt();

  const blocked = !cancellable && !disabled;

  function handleConfirm() {
    setErrorCode(null);
    startTransition(async () => {
      const result = await cancelBookingAction(locale, bookingId);
      // Con `REFUND_FAILED` la reserva también quedó cancelada: el hueco
      // está libre igualmente y el aviso del reembolso viaja al diálogo.
      const cancelled = result.ok || result.code === 'REFUND_FAILED';
      if (cancelled && openReleasePrompt && startAtIso) {
        setOpen(false);
        openReleasePrompt({
          target: { kind: 'cancelled', bookingId, startAtIso },
          notice: result.ok ? null : 'refundFailed',
        });
        return;
      }
      if (result.ok) {
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
        case 'TOO_LATE':
          setErrorCode('tooLate');
          break;
        case 'NOT_CANCELLABLE':
          setErrorCode('notCancellable');
          break;
        case 'REFUND_FAILED':
          setErrorCode('refundFailed');
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
    <div className="flex flex-col gap-1 sm:items-end">
      <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
        <AlertDialog.Trigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || !cancellable}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            data-component={`booking-actions-cancel-${bookingId}`}
          >
            <XCircle className="size-3.5" aria-hidden />
            {t('button')}
          </Button>
        </AlertDialog.Trigger>

        <AlertDialog.Portal>
          <AlertDialog.Overlay className={d.overlay} />
          <AlertDialog.Content
            className={d.content}
            data-component={`booking-actions-cancel-dialog-${bookingId}`}
          >
            <AlertDialog.Title className={d.title}>{t('confirmTitle')}</AlertDialog.Title>
            <AlertDialog.Description className={d.description}>
              {t('confirmDescription')}
            </AlertDialog.Description>

            {errorCode && (
              <p
                role="alert"
                className={d.errorBanner}
                data-component={`booking-actions-cancel-error-${bookingId}`}
              >
                {t(`errors.${errorCode}`)}
              </p>
            )}

            <div className={d.actions}>
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="outline" size="sm" disabled={isPending}>
                  {t('keep')}
                </Button>
              </AlertDialog.Cancel>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleConfirm}
                data-component={`booking-actions-cancel-confirm-${bookingId}`}
              >
                {isPending ? t('pending') : t('confirmAction')}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {blocked && (
        <p className={s.blockedHint} data-component={`booking-actions-cancel-hint-${bookingId}`}>
          {t('blockedHint')}
        </p>
      )}
    </div>
  );
}
