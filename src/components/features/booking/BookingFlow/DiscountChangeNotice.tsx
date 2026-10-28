import { useTranslations } from 'next-intl';

import type { AppLocale } from '@/i18n/routing';

import { formatPriceCents } from '../BookingSummary/BookingSummary.logic';

import type { DiscountChange } from './BookingFlow.price';
import { discountChangeNoticeStyles as s } from './DiscountChangeNotice.styles';

interface DiscountChangeNoticeProps {
  /** Cambio detectado por `resolveDiscountChange`. */
  change: DiscountChange;
  locale: AppLocale;
}

/**
 * Aviso, justo antes de pagar, de que el descuento del hueco ya no es
 * el que el cliente vio al elegirlo.
 *
 * `role="status"`: se anuncia sin interrumpir. El importe que cita es
 * el del servidor, el mismo que se cobra.
 */
export function DiscountChangeNotice({ change, locale }: DiscountChangeNoticeProps) {
  const t = useTranslations('booking.slotOffer');
  const amount = formatPriceCents(change.amountCents, locale);

  return (
    <p className={s.root} role="status" data-component={`booking-discount-${change.kind}`}>
      {change.kind === 'lost'
        ? t('discountLost', { amount })
        : t('discountChanged', { amount, pct: change.discountPct })}
    </p>
  );
}
