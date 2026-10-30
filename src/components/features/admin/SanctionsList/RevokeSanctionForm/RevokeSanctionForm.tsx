'use client';

import { Loader2, ShieldOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AppLocale } from '@/i18n/routing';
import {
  REVOKE_REASON_MAX_LENGTH,
  REVOKE_REASON_MIN_LENGTH,
} from '@/lib/services/sanctions/sanctions.validation';

import { dismissRefundFormStyles as s } from '../../RefundsQueue/DismissRefundForm/DismissRefundForm.styles';
import { useRevokeSanction } from './RevokeSanctionForm.logic';

interface RevokeSanctionFormProps {
  sanctionId: string;
  /** Para el nombre accesible del botón (varias filas en la lista). */
  clientEmail: string;
  locale: AppLocale;
}

/**
 * «Retirar sanción» de una fila: plegado, solo el botón; desplegado, el
 * motivo (obligatorio, queda auditado) y la confirmación. Reutiliza los
 * estilos del descarte de reembolsos: es el mismo gesto de soporte.
 */
export function RevokeSanctionForm({ sanctionId, clientEmail, locale }: RevokeSanctionFormProps) {
  const t = useTranslations('adminArea.sanctions.revoke');
  const form = useRevokeSanction(sanctionId, locale);
  const { ids, reason, showReasonError, errorCode, isPending } = form;

  if (!form.isOpen) {
    return (
      <button
        type="button"
        className={s.trigger}
        onClick={form.open}
        aria-label={t('aria', { email: clientEmail })}
        data-component={`admin-sanction-revoke-${sanctionId}`}
      >
        <ShieldOff className={s.icon} aria-hidden="true" />
        {t('label')}
      </button>
    );
  }

  return (
    <form className={s.form} onSubmit={form.submit} noValidate>
      <label htmlFor={ids.reason} className={s.label}>
        {t('reasonLabel')}
      </label>
      <textarea
        id={ids.reason}
        className={s.textarea}
        value={reason}
        onChange={(event) => form.changeReason(event.target.value)}
        rows={3}
        maxLength={REVOKE_REASON_MAX_LENGTH}
        required
        aria-invalid={showReasonError}
        aria-describedby={showReasonError ? `${ids.hint} ${ids.error}` : ids.hint}
      />
      <p id={ids.hint} className={s.hint}>
        {t('reasonHint', { min: REVOKE_REASON_MIN_LENGTH })}
      </p>
      {showReasonError && (
        <p id={ids.error} className={s.error} role="alert">
          {t('reasonTooShort', { min: REVOKE_REASON_MIN_LENGTH })}
        </p>
      )}
      {errorCode && (
        <p className={s.error} role="alert">
          {t(`errors.${errorCode}`)}
        </p>
      )}
      <div className={s.actions}>
        <button type="submit" className={s.confirm} disabled={isPending} aria-busy={isPending}>
          {isPending && <Loader2 className={s.spinner} aria-hidden="true" />}
          {isPending ? t('pending') : t('confirm')}
        </button>
        <button type="button" className={s.cancel} onClick={form.cancel} disabled={isPending}>
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
