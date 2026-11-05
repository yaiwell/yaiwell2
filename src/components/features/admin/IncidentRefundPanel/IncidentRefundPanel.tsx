'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { failureMessageKey, outcomeTone, useIncidentRefund } from './IncidentRefundPanel.logic';
import {
  incidentRefundMessage,
  incidentRefundPanelStyles as s,
} from './IncidentRefundPanel.styles';
import type { IncidentRefundPanelProps } from './IncidentRefundPanel.types';

/**
 * Reembolso por incidencia del centro, bajo la cola de `/admin/reembolsos`.
 *
 * Es para lo que el centro no puede cancelar por su cuenta. El resumen y la
 * elegibilidad vienen del servidor; aquí solo se pintan. La lógica vive en
 * `useIncidentRefund`.
 */
export function IncidentRefundPanel({ locale }: IncidentRefundPanelProps) {
  const t = useTranslations('adminArea.refunds.incident');
  const {
    bookingId,
    preview,
    note,
    showNoteError,
    failure,
    outcome,
    slot,
    isResume,
    canResendNotices,
    isSearching,
    isRefunding,
    amount,
    appointment,
    noteLimits,
    ids,
    changeBookingId,
    changeNote,
    reset,
    search,
    confirm,
  } = useIncidentRefund(locale);

  return (
    <section className={s.root} aria-labelledby={ids.title} data-component="admin-incident-refund">
      <header className={s.header}>
        <h2 id={ids.title} className={s.title}>
          {t('title')}
        </h2>
        <p className={s.intro}>{t('intro')}</p>
      </header>

      <form className={s.lookup} onSubmit={search} noValidate>
        <div className={s.field}>
          <label htmlFor={ids.bookingId} className={s.label}>
            {t('lookup.label')}
          </label>
          <input
            id={ids.bookingId}
            className={s.input}
            value={bookingId}
            onChange={(event) => changeBookingId(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          type="submit"
          className={s.search}
          disabled={isSearching || isRefunding || bookingId.trim() === ''}
          aria-busy={isSearching}
        >
          {isSearching && <Loader2 className={s.spinner} aria-hidden="true" />}
          {isSearching ? t('lookup.pending') : t('lookup.submit')}
        </button>
      </form>

      <div role="status" aria-live="polite" data-component="admin-incident-refund-status">
        {failure && (
          <p className={incidentRefundMessage({ tone: 'error' })}>
            {t(failureMessageKey(failure))}
          </p>
        )}
        {outcome && (
          <div className={incidentRefundMessage({ tone: outcomeTone(outcome) })}>
            <p>{t(`outcome.${outcome}`, { amount })}</p>
            {slot !== 'not_applicable' && <p>{t(`slot.${slot}`)}</p>}
          </div>
        )}
      </div>

      {preview && (
        <div className={s.card} data-component="admin-incident-refund-summary">
          <dl className={s.details}>
            <div className={s.detailItem}>
              <dt className={s.detailLabel}>{t('summary.provider')}</dt>
              <dd className={s.detailValue}>{preview.providerName}</dd>
            </div>
            <div className={s.detailItem}>
              <dt className={s.detailLabel}>{t('summary.service')}</dt>
              <dd className={s.detailValue}>{preview.serviceName}</dd>
            </div>
            <div className={s.detailItem}>
              <dt className={s.detailLabel}>{t('summary.appointment')}</dt>
              <dd className={s.detailValue}>{appointment}</dd>
            </div>
            <div className={s.detailItem}>
              <dt className={s.detailLabel}>{t('summary.amount')}</dt>
              <dd className={s.detailValue}>{amount}</dd>
            </div>
            <div className={s.detailItem}>
              <dt className={s.detailLabel}>{t('summary.status')}</dt>
              <dd className={s.detailValue}>
                {outcome ? t('statuses.cancelled') : t(`statuses.${preview.status}`)}
              </dd>
            </div>
          </dl>

          {!preview.eligibility.eligible && (
            <p className={s.ineligible}>{t(`ineligible.${preview.eligibility.reason}`)}</p>
          )}

          {canResendNotices && !outcome && (
            <form className={s.form} onSubmit={confirm} noValidate>
              <p className={s.warning}>{t('confirm.resendHint')}</p>
              <button
                type="submit"
                className={s.search}
                disabled={isRefunding}
                aria-busy={isRefunding}
              >
                {isRefunding && <Loader2 className={s.spinner} aria-hidden="true" />}
                {t('confirm.resendLabel')}
              </button>
            </form>
          )}

          {preview.eligibility.eligible && !outcome && (
            <form className={s.form} onSubmit={confirm} noValidate>
              <p className={s.warning}>
                {isResume ? t('confirm.resumeWarning') : t('confirm.warning')}
              </p>
              {!isResume && (
                <>
                  <label htmlFor={ids.note} className={s.label}>
                    {t('note.label')}
                  </label>
                  <textarea
                    id={ids.note}
                    className={s.textarea}
                    value={note}
                    onChange={(event) => changeNote(event.target.value)}
                    rows={3}
                    maxLength={noteLimits.max}
                    required
                    aria-invalid={showNoteError}
                    aria-describedby={showNoteError ? `${ids.hint} ${ids.error}` : ids.hint}
                  />
                  <p id={ids.hint} className={s.hint}>
                    {t('note.hint', noteLimits)}
                  </p>
                  {showNoteError && (
                    <p id={ids.error} className={s.noteError} role="alert">
                      {t('note.invalid', noteLimits)}
                    </p>
                  )}
                </>
              )}
              <button
                type="submit"
                className={s.confirm}
                disabled={isRefunding}
                aria-busy={isRefunding}
              >
                {isRefunding && <Loader2 className={s.spinner} aria-hidden="true" />}
                {isRefunding && t('confirm.pending')}
                {!isRefunding &&
                  (isResume
                    ? t('confirm.resumeLabel', { amount })
                    : t('confirm.label', { amount }))}
              </button>
            </form>
          )}

          {outcome && (
            <button type="button" className={s.reset} onClick={reset}>
              {t('reset')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
