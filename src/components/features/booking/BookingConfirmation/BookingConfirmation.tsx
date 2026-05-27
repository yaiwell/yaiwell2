import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

import {
  formatPriceCents,
  formatSlotDateLong,
  formatSlotTimeOnly,
} from '../BookingSummary/BookingSummary.logic';

import { bookingConfirmationStyles as s } from './BookingConfirmation.styles';
import type { BookingConfirmationProps } from './BookingConfirmation.types';

/**
 * Pantalla final del flujo de reserva.
 *
 * Server Component: solo recibe props y compone JSX (los textos vienen
 * de `next-intl`, que funciona en SSR). No necesita ningún hook ni
 * estado; el "estado" es el hecho de haber llegado a esta ruta del flujo.
 */
export function BookingConfirmation({
  provider,
  service,
  locale,
  slotStartIso,
  slotEndIso,
  bookingId,
  providerSlugWithId,
}: BookingConfirmationProps) {
  const t = useTranslations('booking.confirmation');

  return (
    <div className={s.root} data-component="booking-confirmation">
      <span className={s.iconCircle} aria-hidden>
        <CheckCircle2 className={s.icon} aria-hidden />
      </span>

      <div className={s.titleBlock}>
        <h2 className={s.title}>{t('title')}</h2>
        <p className={s.subtitle}>{t('subtitle')}</p>
      </div>

      <dl className={s.detailsCard}>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('bookingIdLabel')}</dt>
          <dd className={s.rowValueMono}>{bookingId}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('providerLabel')}</dt>
          <dd className={s.rowValue}>{provider.name}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('serviceLabel')}</dt>
          <dd className={s.rowValue}>{service.name[locale]}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('whenLabel')}</dt>
          <dd className={s.rowValue}>
            {formatSlotDateLong(slotStartIso, locale)}
            {' · '}
            {formatSlotTimeOnly(slotEndIso, locale)}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('totalLabel')}</dt>
          <dd className={s.rowValue}>{formatPriceCents(service.priceCents, locale)}</dd>
        </div>
      </dl>

      <div className={s.actions}>
        <Link
          href={`/centro/${providerSlugWithId}`}
          className={s.secondaryAction}
          data-component="booking-confirmation-back-to-provider"
        >
          {t('backToProvider')}
        </Link>
        <Link
          href="/buscar"
          className={s.primaryAction}
          data-component="booking-confirmation-keep-browsing"
        >
          {t('keepBrowsing')}
        </Link>
      </div>
    </div>
  );
}
