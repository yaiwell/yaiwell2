'use client';

import { Loader2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRetryRefund } from './RetryRefundButton.logic';
import { retryRefundButtonStyles as s } from './RetryRefundButton.styles';
import type { RetryRefundButtonProps } from './RetryRefundButton.types';

/**
 * Botón "Reintentar reembolso" de una fila de la cola.
 *
 * Es la única pieza cliente de la tarjeta. Mientras la action corre
 * queda deshabilitado con `aria-busy` y cambia el texto, para que el
 * estado de carga también llegue a quien usa lector de pantalla.
 */
export function RetryRefundButton({ bookingId, providerName, locale }: RetryRefundButtonProps) {
  const t = useTranslations('adminArea.refunds.retry');
  const { isPending, retry } = useRetryRefund(bookingId, providerName, locale);

  return (
    <button
      type="button"
      className={s.button}
      onClick={retry}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={isPending ? undefined : t('aria', { provider: providerName })}
      data-component={`admin-refund-retry-${bookingId}`}
    >
      {isPending ? (
        <Loader2 className={s.iconSpinning} aria-hidden="true" />
      ) : (
        <RotateCcw className={s.icon} aria-hidden="true" />
      )}
      {isPending ? t('pending') : t('label')}
    </button>
  );
}
