'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { useExistingReview } from './ExistingReview.logic';
import { existingReviewStyles as s } from './ExistingReview.styles';
import type { ExistingReviewProps } from './ExistingReview.types';

const STAR_POSITIONS = [1, 2, 3, 4, 5] as const;

/**
 * «Tu valoración: ★★★★☆» más el texto, plegable si es largo.
 *
 * Client Component solo por el «Ver más / Ver menos»; las estrellas son
 * decorativas y la nota se anuncia como texto («4 de 5 estrellas»).
 */
export function ExistingReview({ bookingId, rating, text }: ExistingReviewProps) {
  const t = useTranslations('customerArea.existingReview');
  const textId = useId();
  const { collapsible, expanded, visibleText, toggle } = useExistingReview(text);

  return (
    <div className={s.root} data-component={`customer-booking-existing-review-${bookingId}`}>
      <p className={s.header}>
        {t('label')}
        <span className={s.stars} role="img" aria-label={t('ratingAria', { rating })}>
          {STAR_POSITIONS.map((position) => (
            <Star
              key={position}
              className={position <= rating ? s.starFilled : s.starEmpty}
              aria-hidden="true"
            />
          ))}
        </span>
      </p>
      <p id={textId} className={s.text}>
        {visibleText}
      </p>
      {collapsible ? (
        <button
          type="button"
          className={s.toggle}
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={textId}
        >
          {expanded ? t('showLess') : t('showMore')}
        </button>
      ) : null}
    </div>
  );
}
