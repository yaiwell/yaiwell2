'use client';

import { useTranslations } from 'next-intl';

import { pickLocalized } from '@/lib/i18n/pickLocalized';

import { DiscountedPrice } from '../DiscountedPrice';
import { LastMinuteNotice } from '../LastMinuteNotice';

import {
  formatCancellationDeadline,
  formatSlotDateLong,
  formatSlotTimeOnly,
} from './BookingSummary.logic';
import { bookingSummaryStyles as s } from './BookingSummary.styles';
import type { BookingSummaryProps } from './BookingSummary.types';

/**
 * Resumen previo al pago: muestra centro, servicio, fecha/hora, precio
 * y un campo de notas opcional. La política de cancelación depende del
 * hueco y aparece una sola vez: con margen, la hora exacta hasta la que
 * se cancela gratis; de última hora (< 2 h), que no admite cancelación
 * ni reembolso.
 *
 * Client Component porque maneja el `textarea` de notas controlado por
 * el orquestador padre. El resto del contenido es puramente derivado de
 * las props.
 */
export function BookingSummary({
  provider,
  service,
  locale,
  slotStartIso,
  slotEndIso,
  notes,
  price,
  isLastMinute,
  onNotesChange,
}: BookingSummaryProps) {
  const t = useTranslations('booking.summary');
  const tPolicy = useTranslations('booking.policy');
  const tOffer = useTranslations('booking.slotOffer');

  // `en` y `de` son opcionales en `LocalizedText`: indexar a pelo dejaba
  // el nombre del servicio en blanco en esos dos idiomas.
  const serviceName = pickLocalized(service.name, locale);

  // Con descuento y sin reserva todavía, el importe es una previsión:
  // el tramo puede cambiar antes de abrir el pago y manda el servidor.
  const isEstimatedOffer = price.isEstimate && price.discountPct !== null;

  return (
    <div className={s.root} data-component="booking-summary">
      <div className={s.providerBlock}>
        <div className={s.providerImageWrapper}>
          {provider.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.photos[0]}
              alt=""
              className={s.providerImage}
              loading="lazy"
              aria-hidden
            />
          )}
        </div>
        <div className={s.providerMeta}>
          <h3 className={s.providerName}>{provider.name}</h3>
          <p className={s.providerAddress}>{provider.address}</p>
        </div>
      </div>

      <dl className={s.list}>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('serviceLabel')}</dt>
          <dd className={s.rowValue}>{serviceName}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('dateLabel')}</dt>
          <dd className={s.rowValue}>{formatSlotDateLong(slotStartIso, locale)}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('rangeLabel')}</dt>
          <dd className={s.rowValue}>
            {formatSlotTimeOnly(slotStartIso, locale)}
            {' → '}
            {formatSlotTimeOnly(slotEndIso, locale)}
            {' · '}
            {t('durationValue', { minutes: service.durationMinutes })}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>{t('professionalLabel')}</dt>
          <dd className={s.rowValue}>{t('anyProfessional')}</dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>
            {isEstimatedOffer ? tOffer('estimatedPriceLabel') : t('totalLabel')}
          </dt>
          <dd className={s.rowValueStrong}>
            <DiscountedPrice
              amountCents={price.amountCents}
              originalPriceCents={price.originalPriceCents}
              discountPct={price.discountPct}
              locale={locale}
              dataComponent="booking-summary-total"
            />
            {/* Dentro del <dd>: un <dl> solo admite filas, no párrafos. */}
            {isEstimatedOffer && (
              <span className={s.priceHint} data-component="booking-summary-estimate-hint">
                {tOffer('estimatedPriceHint')}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className={s.notesBlock}>
        <label className={s.notesLabel} htmlFor="booking-summary-notes">
          {t('notesLabel')}
        </label>
        <p className={s.notesHelper}>{t('notesHelper')}</p>
        <textarea
          id="booking-summary-notes"
          className={s.notesTextarea}
          placeholder={t('notesPlaceholder')}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          maxLength={500}
          data-component="booking-summary-notes"
        />
      </div>

      {isLastMinute ? (
        <LastMinuteNotice />
      ) : (
        <section className={s.policyBlock} aria-labelledby="booking-summary-policy">
          <h4 className={s.policyTitle} id="booking-summary-policy">
            {tPolicy('title')}
          </h4>
          <p data-component="booking-summary-cancel-until">
            {tPolicy('cancelUntil', {
              deadline: formatCancellationDeadline(slotStartIso, locale),
            })}
          </p>
          <p>{tPolicy('providerCancel')}</p>
        </section>
      )}
    </div>
  );
}
