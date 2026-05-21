'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Review } from '@/types/domain';

import { formatRelativeDate, useReviewsCollapse } from './ProviderReviewsSection.logic';
import { providerReviewsSectionStyles as s } from './ProviderReviewsSection.styles';
import type { ProviderReviewsSectionProps, RatingBreakdown } from './ProviderReviewsSection.types';

/**
 * Sección de reseñas en la ficha del proveedor.
 *
 * Componente cliente porque gestiona el toggle "ver más / ver menos"
 * con estado local. El cálculo de la media y del breakdown se hace
 * arriba (Server Component) para que llegue ya listo y no obligue a
 * mover toda la data al cliente.
 */
export function ProviderReviewsSection({
  reviews,
  ratingAvg,
  reviewsCount,
  ratingBreakdown,
  locale,
}: ProviderReviewsSectionProps) {
  const t = useTranslations('providerDetail.reviews');
  const { isExpanded, toggle, visibleCount, canExpand } = useReviewsCollapse(reviews.length, 5);

  // Si no hay reseñas, no pintamos el resumen ni el breakdown:
  // solo un empty state honesto. Evita el "0 estrellas" feo.
  // El h2 se pinta una única vez fuera del condicional para evitar
  // duplicación y simplificar la lectura del JSX.
  const isEmpty = reviewsCount === 0 || reviews.length === 0;
  const visibleReviews = reviews.slice(0, visibleCount);

  return (
    <section className={s.section} data-component="provider-reviews-section">
      <h2 id="provider-reviews-heading" className={s.heading}>
        {t('title')}
      </h2>

      {isEmpty ? (
        <p className={s.empty} data-component="provider-reviews-empty">
          {t('empty')}
        </p>
      ) : (
        <>
          <SummaryBlock
            ratingAvg={ratingAvg}
            reviewsCount={reviewsCount}
            breakdown={ratingBreakdown}
            summaryLabel={t('summary', {
              rating: ratingAvg.toFixed(1),
              count: reviewsCount,
            })}
            breakdownLabel={(stars: number) => t('breakdownLabel', { stars })}
          />

          <ul className={s.list} data-component="provider-reviews-list">
            {visibleReviews.map((review) => (
              <ReviewItem key={review.id} review={review} locale={locale} />
            ))}
          </ul>

          {canExpand ? (
            <div className={s.loadMoreWrapper}>
              <button
                type="button"
                onClick={toggle}
                className={s.loadMore}
                data-component="provider-reviews-load-more"
                aria-expanded={isExpanded}
              >
                {isExpanded ? t('collapse') : t('loadMore')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/**
 * Bloque superior con la nota media grande y el breakdown por estrellas.
 * Lo extraemos como sub-componente para que `ProviderReviewsSection`
 * quede más legible y reflejando solo la composición.
 */
function SummaryBlock({
  ratingAvg,
  reviewsCount,
  breakdown,
  summaryLabel,
  breakdownLabel,
}: {
  ratingAvg: number;
  reviewsCount: number;
  breakdown: RatingBreakdown;
  summaryLabel: string;
  breakdownLabel: (stars: number) => string;
}) {
  // Total para calcular porcentajes; nunca dividimos por cero porque
  // el caller garantiza que reviewsCount > 0 antes de renderizar.
  const total = reviewsCount > 0 ? reviewsCount : 1;

  return (
    <div className={s.summary} data-component="provider-reviews-summary">
      <div className={s.summaryLeft}>
        <div className={s.summaryRating}>
          <span className={s.summaryRatingValue}>{ratingAvg.toFixed(1)}</span>
          <Star className={s.summaryStarIcon} aria-hidden="true" />
        </div>
        <span className={s.summaryCount}>{summaryLabel}</span>
      </div>

      <div className={s.breakdown}>
        {/* Iteramos de 5 a 1 para que la barra superior sea la nota más alta. */}
        {([5, 4, 3, 2, 1] as const).map((stars) => {
          const count = breakdown[stars];
          const pct = Math.round((count / total) * 100);
          return (
            <div
              key={stars}
              className={s.breakdownRow}
              data-component={`provider-reviews-breakdown-${stars}`}
            >
              <span className={s.breakdownLabel}>{breakdownLabel(stars)}</span>
              <div
                className={s.breakdownBarTrack}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={breakdownLabel(stars)}
              >
                <div className={s.breakdownBarFill} style={{ width: `${pct}%` }} />
              </div>
              <span className={s.breakdownValue}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Renderizado de una reseña individual.
 * Avatar circular con iniciales, nombre, fecha relativa y estrellas.
 * El texto va debajo, full width.
 */
function ReviewItem({ review, locale }: { review: Review; locale: 'es' | 'ca' }) {
  const initials = getInitials(review.authorName);
  const relativeDate = formatRelativeDate(review.createdAt, locale);

  return (
    <li className={s.item} data-component={`provider-reviews-item-${review.id}`}>
      <header className={s.itemHeader}>
        <div className={s.avatar} aria-hidden="true">
          {initials}
        </div>
        <div className={s.itemMeta}>
          <span className={s.itemAuthor}>{review.authorName}</span>
          <span className={s.itemDate}>{relativeDate}</span>
          <div className={s.itemStars} aria-label={`${review.rating} / 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={n <= review.rating ? s.itemStarActive : s.itemStarInactive}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </header>
      <p className={s.itemText}>{review.text}</p>
    </li>
  );
}

/**
 * Devuelve hasta dos iniciales en mayúscula a partir del nombre.
 * Si solo hay una palabra, devuelve una sola letra; no inventamos
 * iniciales falsas para apellidos que no existen.
 */
function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase();
  }
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
