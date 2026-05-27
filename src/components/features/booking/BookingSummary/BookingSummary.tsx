'use client';

import { useTranslations } from 'next-intl';

import { formatPriceCents, formatSlotDateLong, formatSlotTimeOnly } from './BookingSummary.logic';
import { bookingSummaryStyles as s } from './BookingSummary.styles';
import type { BookingSummaryProps } from './BookingSummary.types';

/**
 * Resumen previo al pago: muestra centro, servicio, fecha/hora, precio
 * y un campo de notas opcional. Incluye un bloque editorial con las
 * políticas básicas (cancelación a 2h por cualquiera de las partes).
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
  onNotesChange,
}: BookingSummaryProps) {
  const t = useTranslations('booking.summary');
  const tPolicy = useTranslations('booking.policy');

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
          <dd className={s.rowValue}>{service.name[locale]}</dd>
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
          <dt className={s.rowLabel}>{t('totalLabel')}</dt>
          <dd className={s.rowValueStrong}>{formatPriceCents(service.priceCents, locale)}</dd>
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

      <section className={s.policyBlock} aria-labelledby="booking-summary-policy">
        <h4 className={s.policyTitle} id="booking-summary-policy">
          {tPolicy('title')}
        </h4>
        <p>{tPolicy('clientCancel')}</p>
        <p>{tPolicy('providerCancel')}</p>
      </section>
    </div>
  );
}
