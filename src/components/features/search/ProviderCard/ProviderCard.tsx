'use client';

import { Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

import { AvailabilityBadge } from '../AvailabilityBadge';
import { formatPriceCents, getMinutesUntilNextSlot } from './ProviderCard.logic';
import { providerCardStyles as s } from './ProviderCard.styles';
import type { ProviderCardProps } from './ProviderCard.types';

/**
 * Card de proveedor para la lista de resultados.
 *
 * Marcamos `'use client'` porque usamos `onMouseEnter/Leave` para
 * comunicar el hover al mapa. Si en el futuro este interacción se
 * extrae a un wrapper, esta card puede volver a ser RSC.
 */
export function ProviderCard({
  provider,
  fromPriceCents,
  highlighted = false,
  onHover,
}: ProviderCardProps) {
  const locale = useLocale();
  const t = useTranslations('search.card');

  const minutesUntilNext = getMinutesUntilNextSlot(provider);

  return (
    <article
      data-provider-id={provider.id}
      data-component={`provider-card-${provider.slug}`}
      className={cn(s.root, highlighted && s.rootHighlighted)}
      onMouseEnter={() => onHover?.(provider.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={s.imageWrapper} data-component="provider-card-image">
        {/* Foto principal (Unsplash). Usamos <img> nativo porque las
            URLs externas y next/image requeriría configurar dominios. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={provider.photos[0]}
          alt={provider.name}
          loading="lazy"
          decoding="async"
          className={s.image}
        />
        <span className={s.badgeOverlay} data-component="provider-card-availability">
          <AvailabilityBadge
            status={provider.availability.status}
            minutesUntilNext={minutesUntilNext}
          />
        </span>
        <span className={s.priceTag} data-component="provider-card-price-range">
          {provider.priceRange}
        </span>
      </div>

      <div className={s.body} data-component="provider-card-body">
        <div className={s.headerRow}>
          <div className="flex flex-col gap-1">
            <span className={s.type} data-component="provider-card-type">
              {t(provider.type === 'autonomo' ? 'typeAutonomous' : 'typeCenter')}
            </span>
            <h3 className={s.name} data-component="provider-card-name">
              {provider.name}
            </h3>
          </div>
        </div>

        <p className={s.address} data-component="provider-card-address">
          {provider.address}
        </p>

        <div className={s.metaRow} data-component="provider-card-meta">
          <span className={s.rating} data-component="provider-card-rating">
            <Star className={s.ratingStar} aria-hidden />
            {provider.rating.toFixed(1)}
          </span>
          <span className={s.reviews} data-component="provider-card-reviews">
            {t('reviews', { count: provider.reviewsCount })}
          </span>
          {provider.distanceKm !== null && (
            <>
              <span className={s.separator} aria-hidden>
                ·
              </span>
              <span className={s.distance} data-component="provider-card-distance">
                {t('distance', { km: provider.distanceKm.toFixed(1) })}
              </span>
            </>
          )}
        </div>

        <div className={s.footerRow} data-component="provider-card-footer">
          {fromPriceCents !== null ? (
            <div className={s.fromPrice} data-component="provider-card-from-price">
              <span className={s.fromPriceLabel}>{t('from')}</span>
              <span className={s.fromPriceValue}>{formatPriceCents(fromPriceCents, locale)}</span>
            </div>
          ) : (
            <span />
          )}
          <span className={s.ctaLink} data-component="provider-card-cta">
            {t('viewDetail')}
          </span>
        </div>
      </div>
    </article>
  );
}
