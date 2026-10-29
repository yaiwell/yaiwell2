import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { refundsQueueStyles as s } from './RefundsQueue.styles';
import type { RefundsQueueProps } from './RefundsQueue.types';
import { RefundsQueueItem } from './RefundsQueueItem';
import { RetryFeedbackRegion } from './RetryFeedbackRegion';

/**
 * Cola de reembolsos fallidos del panel admin (`/admin/reembolsos`).
 *
 * Server Component: la lista llega ya leída de BD y se pinta en el
 * servidor. La región de aviso y el botón de reintento son las únicas
 * piezas cliente. El aviso fijo explica a soporte que reintentar es
 * seguro y dónde mirar si el reembolso sigue fallando.
 */
export function RefundsQueue({ refunds, locale }: RefundsQueueProps) {
  const t = useTranslations('adminArea.refunds');

  return (
    <section
      className={s.root}
      aria-labelledby="admin-refunds-title"
      data-component="admin-refunds-queue"
    >
      <aside className={s.notice} data-component="admin-refunds-notice">
        <Info className={s.noticeIcon} aria-hidden="true" />
        <div className={s.noticeBody}>
          <p className={s.noticeTitle}>{t('notice.title')}</p>
          <p>{t('notice.noDoubleRefund')}</p>
          <p>{t('notice.stillFailing')}</p>
          <p>{t('notice.dismiss')}</p>
        </div>
      </aside>

      <header className={s.sectionHeader}>
        <h2 id="admin-refunds-title" className={s.sectionTitle}>
          {t('queue.title')}
        </h2>
        <span className={s.sectionCount}>{t('queue.count', { count: refunds.length })}</span>
      </header>

      <RetryFeedbackRegion>
        {refunds.length === 0 ? (
          <p className={s.empty}>{t('queue.empty')}</p>
        ) : (
          <ul className={s.list} data-component="admin-refunds-list">
            {refunds.map((refund) => (
              <RefundsQueueItem key={refund.bookingId} refund={refund} locale={locale} />
            ))}
          </ul>
        )}
      </RetryFeedbackRegion>
    </section>
  );
}
