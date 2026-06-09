'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { computeAverageRating, useReviewsFilters } from './ReceivedReviews.logic';
import { receivedReviewsStyles as s } from './ReceivedReviews.styles';
import type {
  ReceivedReviewsProps,
  ReviewPeriod,
  ReviewStarsFilter,
} from './ReceivedReviews.types';

/** Opciones de estrellas exhibidas en el select de filtro. */
const STAR_OPTIONS: ReviewStarsFilter[] = [5, 4, 3, 2, 1];

/** Formateador estable de fecha relativa (mes y año). */
const DATE_FORMATTERS: Record<'es' | 'ca' | 'en' | 'de', Intl.DateTimeFormat> = {
  es: new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
  ca: new Intl.DateTimeFormat('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
  en: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  de: new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }),
};

/**
 * Vista de valoraciones recibidas por el proveedor.
 *
 * Client Component porque la barra de filtros es interactiva (estrellas,
 * periodo y switch "solo sin respuesta"). La lógica de filtrado vive
 * en `useReviewsFilters` para mantener este componente centrado en JSX.
 */
export function ReceivedReviews({ reviews, locale }: ReceivedReviewsProps) {
  const t = useTranslations('providerPanel.reviews');
  const tFilters = useTranslations('providerPanel.reviews.filters');
  const tCard = useTranslations('providerPanel.reviews.card');
  const { filters, setFilters, filteredReviews } = useReviewsFilters(reviews);

  const averageRating = computeAverageRating(reviews);
  const dateFormatter = DATE_FORMATTERS[locale];

  return (
    <section className={s.root} data-component="received-reviews">
      <header className={s.header}>
        <h1 className={s.title}>{t('title')}</h1>
        <p className={s.subtitle}>{t('subtitle')}</p>
        <p className={s.summary}>
          {t('summary', { rating: averageRating, count: reviews.length })}
        </p>
      </header>

      <div className={s.filters} data-component="received-reviews-filters">
        <div className={s.filterGroup}>
          <label className={s.filterLabel} htmlFor="reviews-filter-stars">
            {tFilters('starsLabel')}
          </label>
          <select
            id="reviews-filter-stars"
            className={s.select}
            value={filters.stars ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = raw === '' ? null : (Number(raw) as ReviewStarsFilter);
              setFilters((prev) => ({ ...prev, stars: parsed }));
            }}
            data-component="received-reviews-stars-select"
          >
            <option value="">{tFilters('allStars')}</option>
            {STAR_OPTIONS.map((starOption) => (
              <option key={starOption} value={String(starOption)}>
                {starOption}
              </option>
            ))}
          </select>
        </div>

        <div className={s.filterGroup}>
          <label className={s.filterLabel} htmlFor="reviews-filter-period">
            {tFilters('periodLabel')}
          </label>
          <select
            id="reviews-filter-period"
            className={s.select}
            value={filters.period}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, period: e.target.value as ReviewPeriod }))
            }
            data-component="received-reviews-period-select"
          >
            <option value="7d">{tFilters('period7d')}</option>
            <option value="30d">{tFilters('period30d')}</option>
            <option value="90d">{tFilters('period90d')}</option>
            <option value="all">{tFilters('periodAll')}</option>
          </select>
        </div>

        <label className={s.toggleRow}>
          <input
            type="checkbox"
            checked={filters.withoutResponseOnly}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, withoutResponseOnly: e.target.checked }))
            }
            data-component="received-reviews-without-response"
          />
          <span className={s.toggleLabel}>{tFilters('withoutResponse')}</span>
        </label>
      </div>

      {filteredReviews.length === 0 ? (
        <div className={s.empty} data-component="received-reviews-empty">
          {t('empty')}
        </div>
      ) : (
        <ul className={s.list}>
          {filteredReviews.map((review) => (
            <li
              key={review.id}
              className={s.card}
              data-component={`received-reviews-item-${review.id}`}
            >
              <div className={s.cardHeader}>
                <span className={s.cardAuthor}>{review.authorName}</span>
                <span className={s.cardMeta}>{dateFormatter.format(review.createdAt)}</span>
              </div>

              <div className={s.starsRow} aria-label={`${review.rating}/5`}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={idx < review.rating ? s.starFilled : s.starEmpty}
                    aria-hidden
                  />
                ))}
              </div>

              <span className={s.cardServiceTag}>
                {tCard('serviceLabel')}: {review.serviceName}
              </span>

              <p className={s.cardText}>{review.text}</p>

              {review.providerResponse ? (
                <div className={s.responseBox}>
                  <span className={s.responseTitle}>{tCard('responseTitle')}</span>
                  <p className={s.responseText}>{review.providerResponse.text}</p>
                </div>
              ) : (
                <span className={s.pendingBadge}>{tCard('pending')}</span>
              )}

              <div className={s.cardActions}>
                {review.providerResponse ? (
                  <span className={s.respondedBadge}>{tCard('alreadyResponded')}</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    data-component={`received-reviews-respond-${review.id}`}
                  >
                    {tCard('respond')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
