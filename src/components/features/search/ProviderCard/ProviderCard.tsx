'use client';

import { ArrowRight, MapPin, Star } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { formatDistance } from '@/lib/services/location';
import { cn } from '@/lib/utils';
import { buildProviderSlugWithId } from '@/lib/utils/provider-slug';

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
  distanceMeters,
  hasRealLocation = true,
}: ProviderCardProps) {
  const locale = useLocale();
  const t = useTranslations('search.card');

  const minutesUntilNext = getMinutesUntilNextSlot(provider);

  // Preferimos la distancia calculada en cliente (`distanceMeters`) porque
  // refleja la ubicación REAL del usuario. Si no se ha pasado, caemos al
  // `distanceKm` que vino del server (calculado contra Barcelona centro).
  // De esta forma la card sigue siendo útil fuera del flujo de búsqueda.
  const distanceLabel: string | null = (() => {
    if (typeof distanceMeters === 'number' && Number.isFinite(distanceMeters)) {
      const formatted = formatDistance(distanceMeters, locale);
      return hasRealLocation
        ? t('distanceShort', { distance: formatted })
        : t('distanceFromFallback', { distance: formatted });
    }
    if (provider.distanceKm !== null) {
      return t('distance', { km: provider.distanceKm.toFixed(1) });
    }
    return null;
  })();

  // Toda la card es navegable: envolvemos en un Link de next-intl que
  // respeta el prefijo de locale. Mantenemos el <article> interno con
  // sus data-attributes y handlers de hover intactos para no romper la
  // comunicación con el mapa.
  const detailHref = `/centro/${buildProviderSlugWithId(provider)}`;

  return (
    <Link href={detailHref} className="block">
      <article
        data-provider-id={provider.id}
        data-component={`provider-card-${provider.slug}`}
        className={cn(s.root, highlighted && s.rootHighlighted)}
        onMouseEnter={() => onHover?.(provider.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className={s.imageWrapper} data-component="provider-card-image">
          {/* Foto principal (Unsplash, hostname registrado en next.config.ts).
              `fill` + `sizes` permite que el navegador descargue la variante
              óptima por viewport. Lazy por defecto: la mayoría de las cards
              están fuera del primer pliegue en la lista de resultados. */}
          <Image
            src={provider.photos[0]}
            alt={provider.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
            {distanceLabel !== null && (
              <span
                className={s.distancePill}
                data-component="provider-card-distance"
                title={hasRealLocation ? undefined : t('distanceFromFallbackHint')}
              >
                <MapPin className={s.distancePillIcon} aria-hidden />
                {distanceLabel}
              </span>
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
            {/* Affordance visual de "ver detalle". Ya no es un enlace
                independiente porque toda la card es clicable; mantenemos
                solo la flecha decorativa para sugerir navegación. */}
            <span className={s.ctaLink} data-component="provider-card-cta" aria-hidden>
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
