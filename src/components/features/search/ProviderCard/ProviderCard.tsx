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
      className={cn(s.root, highlighted && s.rootHighlighted)}
      onMouseEnter={() => onHover?.(provider.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={s.imageWrapper}>
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
        <span className={s.badgeOverlay}>
          <AvailabilityBadge
            status={provider.availability.status}
            minutesUntilNext={minutesUntilNext}
          />
        </span>
        <span className={s.priceTag}>{provider.priceRange}</span>
      </div>

      <div className={s.body}>
        <div className={s.headerRow}>
          <div className="flex flex-col gap-1">
            <span className={s.type}>{provider.type === 'autonomo' ? 'Autónomo' : 'Centro'}</span>
            <h3 className={s.name}>{provider.name}</h3>
          </div>
        </div>

        <p className={s.address}>{provider.address}</p>

        <div className={s.metaRow}>
          <span className={s.rating}>
            <Star className={s.ratingStar} aria-hidden />
            {provider.rating.toFixed(1)}
          </span>
          <span className={s.reviews}>{t('reviews', { count: provider.reviewsCount })}</span>
          {provider.distanceKm !== null && (
            <>
              <span className={s.separator} aria-hidden>
                ·
              </span>
              <span className={s.distance}>
                {t('distance', { km: provider.distanceKm.toFixed(1) })}
              </span>
            </>
          )}
        </div>

        <div className={s.footerRow}>
          {fromPriceCents !== null ? (
            <div className={s.fromPrice}>
              <span className={s.fromPriceLabel}>{t('from')}</span>
              <span className={s.fromPriceValue}>{formatPriceCents(fromPriceCents, locale)}</span>
            </div>
          ) : (
            <span />
          )}
          <span className={s.ctaLink}>{t('viewDetail')}</span>
        </div>
      </div>
    </article>
  );
}
