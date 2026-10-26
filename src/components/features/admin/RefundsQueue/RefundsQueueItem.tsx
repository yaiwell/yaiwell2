import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  buildStripePaymentUrl,
  formatRefundAmount,
  formatRefundDateTime,
} from './RefundsQueue.logic';
import { refundsQueueStyles as s } from './RefundsQueue.styles';
import type { RefundsQueueItemProps } from './RefundsQueue.types';
import { RetryRefundButton } from './RetryRefundButton';

/**
 * Tarjeta de un reembolso fallido.
 *
 * Se renderiza en el servidor; solo el botón de reintento es cliente.
 * Muestra lo que soporte necesita para decidir sin abrir la BD: quién,
 * cuánto, cuándo era la cita, cuándo falló y por qué.
 */
export function RefundsQueueItem({ refund, locale }: RefundsQueueItemProps) {
  const t = useTranslations('adminArea.refunds.item');

  return (
    <li className={s.card} data-component={`admin-refund-row-${refund.bookingId}`}>
      <div className={s.cardMain}>
        <div className={s.cardHeading}>
          <span className={s.provider}>{refund.providerName}</span>
          <span className={s.service}>{refund.serviceName}</span>
        </div>

        <dl className={s.details}>
          <div className={s.detailItem}>
            <dt className={s.detailLabel}>{t('amount')}</dt>
            <dd className={s.amount}>{formatRefundAmount(refund.priceCents, locale)}</dd>
          </div>
          <div className={s.detailItem}>
            <dt className={s.detailLabel}>{t('clientEmail')}</dt>
            <dd className={s.detailValue}>{refund.clientEmail}</dd>
          </div>
          <div className={s.detailItem}>
            <dt className={s.detailLabel}>{t('appointment')}</dt>
            <dd className={s.detailValue}>{formatRefundDateTime(refund.startAt, locale)}</dd>
          </div>
          <div className={s.detailItem}>
            <dt className={s.detailLabel}>{t('failedAt')}</dt>
            <dd className={s.detailValue}>{formatRefundDateTime(refund.refundFailedAt, locale)}</dd>
          </div>
        </dl>

        <div className={s.detailItem}>
          <span className={s.detailLabel}>{t('reason')}</span>
          <p className={s.reason}>{refund.refundFailureReason ?? t('reasonUnknown')}</p>
        </div>
      </div>

      <div className={s.cardActions}>
        <RetryRefundButton
          bookingId={refund.bookingId}
          providerName={refund.providerName}
          locale={locale}
        />
        {refund.stripePaymentIntentId ? (
          <a
            href={buildStripePaymentUrl(refund.stripePaymentIntentId)}
            target="_blank"
            rel="noopener noreferrer"
            className={s.stripeLink}
          >
            {t('openInStripe')}
            <ExternalLink className={s.linkIcon} aria-hidden="true" />
            <span className={s.srOnly}>{t('opensInNewTab')}</span>
          </a>
        ) : (
          <span className={s.noPaymentIntent}>{t('noPaymentIntent')}</span>
        )}
      </div>
    </li>
  );
}
