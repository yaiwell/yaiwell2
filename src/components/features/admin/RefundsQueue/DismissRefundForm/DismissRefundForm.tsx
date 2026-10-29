'use client';

import { Ban, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  REFUND_DISMISS_REASON_MAX_LENGTH,
  REFUND_DISMISS_REASON_MIN_LENGTH,
} from '@/lib/utils/refund-dismiss-reason';

import { useDismissRefund } from './DismissRefundForm.logic';
import { dismissRefundFormStyles as s } from './DismissRefundForm.styles';
import type { DismissRefundFormProps } from './DismissRefundForm.types';

/**
 * "Descartar" de una fila de la cola de reembolsos.
 *
 * Plegado muestra solo el botón; desplegado, el campo de motivo
 * (obligatorio, queda auditado) y la confirmación. Dos pasos a propósito:
 * descartar saca la reserva de la cola sin devolver dinero.
 */
export function DismissRefundForm({ bookingId, providerName, locale }: DismissRefundFormProps) {
  const t = useTranslations('adminArea.refunds.dismiss');
  const { isOpen, reason, showReasonError, isPending, ids, open, cancel, changeReason, submit } =
    useDismissRefund(bookingId, providerName, locale);

  if (!isOpen) {
    return (
      <button
        type="button"
        className={s.trigger}
        onClick={open}
        aria-label={t('aria', { provider: providerName })}
        data-component={`admin-refund-dismiss-${bookingId}`}
      >
        <Ban className={s.icon} aria-hidden="true" />
        {t('label')}
      </button>
    );
  }

  return (
    <form
      className={s.form}
      onSubmit={submit}
      noValidate
      data-component={`admin-refund-dismiss-form-${bookingId}`}
    >
      <label htmlFor={ids.reason} className={s.label}>
        {t('reasonLabel')}
      </label>
      <textarea
        id={ids.reason}
        className={s.textarea}
        value={reason}
        onChange={(event) => changeReason(event.target.value)}
        rows={3}
        maxLength={REFUND_DISMISS_REASON_MAX_LENGTH}
        required
        aria-invalid={showReasonError}
        aria-describedby={showReasonError ? `${ids.hint} ${ids.error}` : ids.hint}
      />
      <p id={ids.hint} className={s.hint}>
        {t('reasonHint', { min: REFUND_DISMISS_REASON_MIN_LENGTH })}
      </p>
      {showReasonError && (
        <p id={ids.error} className={s.error} role="alert">
          {t('reasonTooShort', { min: REFUND_DISMISS_REASON_MIN_LENGTH })}
        </p>
      )}
      <div className={s.actions}>
        <button type="submit" className={s.confirm} disabled={isPending} aria-busy={isPending}>
          {isPending && <Loader2 className={s.spinner} aria-hidden="true" />}
          {isPending ? t('pending') : t('confirm')}
        </button>
        <button type="button" className={s.cancel} onClick={cancel} disabled={isPending}>
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
