'use client';

import { XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';

import { Button } from '@/components/ui/button';

import { useCancelBookingDialog } from './CancelBookingDialog.logic';
import { cancelBookingDialogStyles as s } from './CancelBookingDialog.styles';
import type { CancelBookingDialogProps } from './CancelBookingDialog.types';

/**
 * Botón «Cancelar reserva» de la card del cliente y su confirmación.
 *
 * La card solo lo monta cuando el servidor dice que se puede cancelar
 * (`cancellation.kind === 'allowed'`). La lógica (ventana de 2 h en
 * vivo, envío, resultado) vive en `useCancelBookingDialog`.
 *
 * El diálogo cuenta antes de confirmar qué pasa con el dinero (importe
 * íntegro y plazo de 5-10 días, o que no hubo cobro).
 */
export function CancelBookingDialog({
  bookingId,
  serviceName,
  providerName,
  startAtIso,
  whenLabel,
  amountLabel,
  refundable,
  enforceWindow,
}: CancelBookingDialogProps) {
  const t = useTranslations('customerArea');
  const { open, changeOpen, errorCode, resultMessage, isPending, confirm, showHint, showConfirm } =
    useCancelBookingDialog({ bookingId, amountLabel, startAtIso, enforceWindow });

  if (showHint) {
    return (
      <span className={s.hint} data-component={`customer-booking-cancel-hint-${bookingId}`}>
        {t('actions.tooLateHint')}
      </span>
    );
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={changeOpen}>
      <AlertDialog.Trigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className={s.trigger}
          data-component={`customer-booking-cancel-${bookingId}`}
        >
          <XCircle className={s.triggerIcon} aria-hidden="true" />
          {t('actions.cancel')}
        </Button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className={s.overlay} />
        <AlertDialog.Content
          className={s.content}
          data-component={`customer-booking-cancel-dialog-${bookingId}`}
        >
          <AlertDialog.Title className={s.title}>{t('cancelDialog.title')}</AlertDialog.Title>
          <AlertDialog.Description className={s.description}>
            {t('cancelDialog.description', {
              service: serviceName,
              provider: providerName,
              when: whenLabel,
            })}
          </AlertDialog.Description>

          <p className={s.money}>
            {refundable
              ? t('cancelDialog.refundInfo', { amount: amountLabel })
              : t('cancelDialog.noPaymentInfo')}
          </p>

          {errorCode ? (
            <p role="alert" className={s.errorBanner}>
              {t(`cancelDialog.errors.${errorCode}`)}
            </p>
          ) : null}

          {resultMessage ? (
            <p role="status" className={s.resultBanner}>
              {resultMessage}
            </p>
          ) : null}

          <div className={s.actions}>
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" size="sm" disabled={isPending}>
                {t('cancelDialog.keep')}
              </Button>
            </AlertDialog.Cancel>
            {showConfirm ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={confirm}
                data-component={`customer-booking-cancel-confirm-${bookingId}`}
              >
                {isPending ? t('cancelDialog.pending') : t('cancelDialog.confirm')}
              </Button>
            ) : null}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
