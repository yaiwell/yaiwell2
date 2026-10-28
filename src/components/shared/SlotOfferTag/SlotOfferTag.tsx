import { Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

import { buildSlotOfferHref, formatOfferWhen } from './SlotOfferTag.logic';
import { slotOfferTag, slotOfferTagStyles as s } from './SlotOfferTag.styles';
import type { SlotOfferTagProps } from './SlotOfferTag.types';

/**
 * Etiqueta «Hueco liberado · −20 % · 17:00» que enlaza al flujo de
 * reserva con ese hueco ya elegido.
 *
 * La comparten la card del buscador, el popup del mapa y la ficha del
 * centro. Sin `'use client'`: `useTranslations` y el `Link` de next-intl
 * funcionan en ambos árboles. No reordena nada ni mete urgencia: solo
 * anuncia el hueco (CLAUDE.md §4.bis).
 */
export function SlotOfferTag({
  offer,
  providerSlugWithId,
  variant = 'inline',
  now,
  dataComponent = 'slot-offer-tag',
}: SlotOfferTagProps) {
  const t = useTranslations('search.slotOffer');
  const locale = useLocale() as AppLocale;
  const when = formatOfferWhen(offer.startAtIso, locale, now);

  return (
    <Link
      href={buildSlotOfferHref(providerSlugWithId, offer)}
      className={slotOfferTag({ variant })}
      aria-label={t('tagAria', { pct: offer.discountPct, when })}
      data-component={dataComponent}
    >
      <Sparkles className={s.icon} aria-hidden />
      <span className={s.text}>{t('tag', { pct: offer.discountPct, when })}</span>
    </Link>
  );
}
