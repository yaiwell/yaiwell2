'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatRefundAmount, formatRefundDateTime } from '@/lib/utils/admin-refund-format';

import { failureMessageKey, outcomeTone } from './IncidentRefundPanel.logic';
import {
  incidentRefundMessage,
  incidentRefundPanelStyles as s,
} from './IncidentRefundPanel.styles';
import type { UnfinishedIncidentRefundsProps } from './IncidentRefundPanel.types';
import { useUnfinishedIncidentRefunds } from './UnfinishedIncidentRefunds.logic';

/**
 * Reembolsos por incidencia a medias, visibles sin pegar el id.
 *
 * Sin filas ni aviso no pinta nada: es un caso excepcional y no debe ocupar la
 * pantalla. La región de aviso sigue en el DOM para anunciar el resultado.
 */
export function UnfinishedIncidentRefunds({ refunds, locale }: UnfinishedIncidentRefundsProps) {
  const t = useTranslations('adminArea.refunds');
  const { feedback, pendingId, isPending, complete } = useUnfinishedIncidentRefunds(locale);

  return (
    <section className={s.unfinishedRoot} data-component="admin-unfinished-incident-refunds">
      <div role="status" aria-live="polite">
        {feedback?.kind === 'failure' && (
          <p className={incidentRefundMessage({ tone: 'error' })}>
            {t(`incident.${failureMessageKey(feedback.failure)}`)}
          </p>
        )}
        {feedback?.kind === 'outcome' && (
          <div className={incidentRefundMessage({ tone: outcomeTone(feedback.outcome) })}>
            <p>{t(`incident.outcome.${feedback.outcome}`, { amount: feedback.amount })}</p>
            {feedback.slot !== 'not_applicable' && <p>{t(`incident.slot.${feedback.slot}`)}</p>}
          </div>
        )}
      </div>

      {refunds.length > 0 && (
        <>
          <header className={s.header}>
            <h2 className={s.title}>{t('unfinished.title')}</h2>
            <p className={s.intro}>{t('unfinished.subtitle')}</p>
          </header>
          <ul className={s.unfinishedList}>
            {refunds.map((refund) => {
              const busy = pendingId === refund.bookingId;
              return (
                <li key={refund.bookingId} className={s.unfinishedCard}>
                  <div className={s.unfinishedMain}>
                    <div>
                      <p className={s.unfinishedProvider}>{refund.providerName}</p>
                      <p className={s.unfinishedService}>{refund.serviceName}</p>
                    </div>
                    <dl className={s.details}>
                      <div className={s.detailItem}>
                        <dt className={s.detailLabel}>{t('unfinished.amount')}</dt>
                        <dd className={s.detailValue}>
                          {formatRefundAmount(refund.priceCents, locale)}
                        </dd>
                      </div>
                      <div className={s.detailItem}>
                        <dt className={s.detailLabel}>{t('unfinished.appointment')}</dt>
                        <dd className={s.detailValue}>
                          {formatRefundDateTime(refund.startAt, locale)}
                        </dd>
                      </div>
                      <div className={s.detailItem}>
                        <dt className={s.detailLabel}>{t('unfinished.markedAt')}</dt>
                        <dd className={s.detailValue}>
                          {formatRefundDateTime(refund.incidentRefundAt, locale)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <button
                    type="button"
                    className={s.complete}
                    onClick={() => complete(refund.bookingId, refund.priceCents)}
                    disabled={isPending}
                    aria-busy={busy}
                    aria-label={
                      busy ? undefined : t('unfinished.aria', { provider: refund.providerName })
                    }
                  >
                    {busy && <Loader2 className={s.spinner} aria-hidden="true" />}
                    {busy ? t('unfinished.pending') : t('unfinished.label')}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
