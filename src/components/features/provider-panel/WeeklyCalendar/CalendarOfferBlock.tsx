'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from 'radix-ui';

import { Button } from '@/components/ui/button';

import { bookingActionDialogStyles as d } from '../BookingActionsList/BookingActionsList.styles';
import type { SupportedLocale } from '../BookingActionsList/BookingActionsList.types';
import { useWithdrawOffer } from './CalendarOfferBlock.logic';
import { getLaneStyle } from './WeeklyCalendar.lanes';
import { WEEKDAY_KEYS } from './WeeklyCalendar.logic';
import { bookingDetailStyles as ds, weeklyCalendarStyles as s } from './WeeklyCalendar.styles';
import type { PositionedOffer } from './WeeklyCalendar.types';

interface CalendarOfferBlockProps {
  positioned: PositionedOffer;
  locale: SupportedLocale;
  readOnly: boolean;
  /** Pinta de quién es el hueco (vista «Todos» con equipo). */
  showProfessional?: boolean;
  variant: 'week' | 'day';
}

const TIERS = ['over2h', 'oneToTwoHours', 'underOneHour'] as const;

/**
 * Bloque discontinuo de un hueco liberado con descuento y sin vender.
 * Al tocarlo abre su detalle: % y precio vigentes, descuentos por
 * tramo y «Retirar oferta» (deshabilitado en modo preview).
 */
export function CalendarOfferBlock({
  positioned,
  locale,
  readOnly,
  showProfessional = false,
  variant,
}: CalendarOfferBlockProps) {
  const t = useTranslations('providerPanel.calendar');
  const to = useTranslations('providerPanel.calendar.slotOffers');
  const { offer, topPx, heightPx, lane, priceLabel, currentPriceLabel } = positioned;
  const { withdraw, isPending, errorKey } = useWithdrawOffer(locale, offer.id);
  const hasDiscount = offer.currentDiscountPct > 0;
  const label = hasDiscount
    ? to('block.label', { pct: offer.currentDiscountPct })
    : to('block.labelNoDiscount');
  const professional = showProfessional ? offer.professionalName : null;
  const ariaLabel = to('block.ariaLabel', {
    label,
    service: offer.serviceName,
    time: offer.startTime,
  });

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={s.offerBlock}
          style={{ top: `${topPx}px`, height: `${heightPx}px`, ...getLaneStyle(lane) }}
          aria-label={
            professional ? t('withProfessional', { label: ariaLabel, professional }) : ariaLabel
          }
          data-component={`weekly-calendar-offer-${offer.id}${variant === 'day' ? '-day' : ''}`}
        >
          <span className={s.bookingTitle}>{label}</span>
          <span className={s.bookingMeta}>
            {offer.startTime} · {offer.serviceName}
          </span>
          {professional && <span className={s.bookingPro}>{professional}</span>}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className={d.overlay} />
        <Dialog.Content
          className={d.content}
          data-component={`weekly-calendar-offer-detail-${offer.id}`}
        >
          <div className={ds.header}>
            <Dialog.Title className={d.title}>{to('detail.title')}</Dialog.Title>
            <Dialog.Close className={ds.close} aria-label={t('details.close')}>
              <X className={ds.closeIcon} aria-hidden />
            </Dialog.Close>
          </div>
          <Dialog.Description className={ds.srOnly}>{to('detail.description')}</Dialog.Description>

          <dl className={ds.list}>
            <dt className={ds.term}>{t('details.when')}</dt>
            <dd className={ds.value}>
              {t(`weekdays.${WEEKDAY_KEYS[offer.weekday]}`)} · {offer.startTime}–{offer.endTime}
            </dd>
            <dt className={ds.term}>{to('detail.service')}</dt>
            <dd className={ds.value}>{offer.serviceName}</dd>
            {offer.professionalName && (
              <>
                <dt className={ds.term}>{t('details.professional')}</dt>
                <dd className={ds.value}>{offer.professionalName}</dd>
              </>
            )}
            <dt className={ds.term}>{to('detail.priceNow')}</dt>
            <dd className={ds.value} data-component={`weekly-calendar-offer-price-${offer.id}`}>
              {currentPriceLabel}
              {hasDiscount && <span className={ds.originalPrice}>{priceLabel}</span>}
            </dd>
            <dt className={ds.term}>{to('detail.tiers')}</dt>
            <dd className={ds.value}>
              <ul className={ds.tierList}>
                {TIERS.map((tier) => (
                  <li key={tier}>
                    {to(`tiers.${tier}`)}: {to('pct', { pct: offer.discounts[tier] })}
                  </li>
                ))}
              </ul>
            </dd>
          </dl>

          {errorKey && (
            <p role="alert" className={d.errorBanner}>
              {to(`withdraw.errors.${errorKey}`)}
            </p>
          )}

          <div className={ds.actions}>
            <p className={ds.hint}>{to('withdraw.hint')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={readOnly || isPending}
              onClick={withdraw}
              data-component={`weekly-calendar-offer-withdraw-${offer.id}`}
            >
              {isPending ? to('withdraw.pending') : to('withdraw.button')}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
