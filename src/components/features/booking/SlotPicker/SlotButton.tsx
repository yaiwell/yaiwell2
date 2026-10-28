import { useTranslations } from 'next-intl';

import type { BookingSlotOffer } from '@/lib/services/availability/availability.client';

import { formatPriceCents } from '../BookingSummary/BookingSummary.logic';

import { slotPickerStyles as s } from './SlotPicker.styles';
import type { SlotPickerLocale } from './SlotPicker.types';

/**
 * Botón individual de un hueco de la rejilla.
 *
 * Los huecos no disponibles se renderizan tachados y deshabilitados en
 * lugar de ocultarse: enseñar la densidad real del centro ayuda a que el
 * usuario entienda por qué su hora preferida no está.
 *
 * Un hueco liberado con descuento lleva una marca discreta «−20 %» y un
 * `aria-label` con el precio rebajado: la marca visual sola no dice al
 * lector de pantalla cuánto va a pagar.
 */
export function SlotButton({
  label,
  available,
  selected,
  offer,
  locale,
  onClick,
}: {
  label: string;
  available: boolean;
  selected: boolean;
  /** Descuento del hueco, si está liberado con oferta. */
  offer?: BookingSlotOffer;
  locale: SlotPickerLocale;
  onClick: () => void;
}) {
  const t = useTranslations('booking.slotOffer');

  // Resolución de variante en este orden: ocupado > seleccionado > libre.
  const variantClass = !available
    ? s.slotButtonDisabled
    : selected
      ? s.slotButtonSelected
      : s.slotButtonIdle;

  const ariaLabel = offer
    ? t('slotAria', {
        time: label,
        pct: offer.discountPct,
        price: formatPriceCents(offer.priceCents, locale),
      })
    : undefined;

  return (
    <button
      type="button"
      disabled={!available}
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${s.slotButtonBase} ${variantClass}`}
      data-component={`booking-slot-picker-slot-${label.replace(':', '')}`}
      data-offer={offer ? 'true' : undefined}
    >
      {label}
      {offer && (
        <span
          className={selected ? s.slotOfferBadgeSelected : s.slotOfferBadge}
          aria-hidden
          data-component="booking-slot-picker-slot-offer"
        >
          {t('discountBadge', { pct: offer.discountPct })}
        </span>
      )}
    </button>
  );
}
