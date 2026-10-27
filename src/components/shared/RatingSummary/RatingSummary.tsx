import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { AppLocale } from '@/i18n/routing';

import { formatRatingValue, getRatingDisplay } from './RatingSummary.logic';
import {
  ratingSummaryCount,
  ratingSummaryNewBadge,
  ratingSummaryRoot,
  ratingSummarySeparator,
  ratingSummaryStar,
  ratingSummaryValue,
} from './RatingSummary.styles';
import type { RatingSummaryProps } from './RatingSummary.types';

/**
 * Valoración de un proveedor: «★ 4.8 · 12 valoraciones» o, si aún no
 * tiene reseñas, la etiqueta «Nuevo en Yaiwell».
 *
 * Centraliza la decisión para que cabecera de ficha, card del listado y
 * popup del mapa no vuelvan a pintar «0.0 · 0 valoraciones».
 *
 * Es un Server Component (sin `'use client'`): `useTranslations` funciona
 * en ambos árboles, así que se usa también dentro del popup del mapa.
 */
export function RatingSummary({
  ratingAvg,
  reviewsCount,
  variant = 'card',
  dataComponent,
}: RatingSummaryProps) {
  const t = useTranslations('ratingSummary');
  const locale = useLocale() as AppLocale;
  const display = getRatingDisplay(ratingAvg, reviewsCount);

  if (display.kind === 'new') {
    return (
      <span
        className={ratingSummaryNewBadge({ variant })}
        data-component={dataComponent}
        data-state="new"
      >
        {t('new')}
      </span>
    );
  }

  return (
    <span
      className={ratingSummaryRoot({ variant })}
      role="group"
      aria-label={t('groupLabel')}
      data-component={dataComponent}
      data-state="rated"
    >
      <span className={ratingSummaryValue({ variant })}>
        <Star className={ratingSummaryStar({ variant })} aria-hidden />
        {formatRatingValue(display.value, locale)}
      </span>
      {variant === 'popup' && (
        <span className={ratingSummarySeparator} aria-hidden>
          ·
        </span>
      )}
      <span className={ratingSummaryCount({ variant })}>
        {t('reviews', { count: display.count })}
      </span>
    </span>
  );
}
