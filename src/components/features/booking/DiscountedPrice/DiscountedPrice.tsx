import { useTranslations } from 'next-intl';

import { formatPriceCents } from '../BookingSummary/BookingSummary.logic';

import { discountedPriceAmount, discountedPriceStyles as s } from './DiscountedPrice.styles';
import type { DiscountedPriceProps } from './DiscountedPrice.types';

/**
 * Importe de una reserva con el precio de referencia tachado cuando el
 * hueco está liberado con descuento.
 *
 * Sin descuento pinta solo el importe. Con descuento, la parte visual
 * (tachado + «−20 %») se oculta al lector de pantalla y se sustituye
 * por una frase completa: un tachado no se anuncia y «45 € 36 €» leído
 * en voz alta no se entiende.
 */
export function DiscountedPrice({
  amountCents,
  originalPriceCents,
  discountPct,
  locale,
  size = 'md',
  dataComponent = 'booking-discounted-price',
}: DiscountedPriceProps) {
  const t = useTranslations('booking.slotOffer');
  const amount = formatPriceCents(amountCents, locale);

  if (originalPriceCents === null || discountPct === null) {
    return (
      <span className={discountedPriceAmount({ size })} data-component={dataComponent}>
        {amount}
      </span>
    );
  }

  const original = formatPriceCents(originalPriceCents, locale);

  return (
    <span className={s.root} data-component={dataComponent}>
      <span className="sr-only">{t('priceAria', { original, amount, pct: discountPct })}</span>
      <del className={s.original} aria-hidden data-component={`${dataComponent}-original`}>
        {original}
      </del>
      <span className={discountedPriceAmount({ size })} aria-hidden>
        {amount}
      </span>
      <span className={s.badge} aria-hidden data-component={`${dataComponent}-pct`}>
        {t('discountBadge', { pct: discountPct })}
      </span>
    </span>
  );
}
