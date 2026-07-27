'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AvailabilityBadge } from '../../AvailabilityBadge';

import { mapProviderPopupStyles as s } from './MapProviderPopup.styles';
import type { MapProviderPopupProps } from './MapProviderPopup.types';

/**
 * Popup premium del mapa para un proveedor concreto.
 *
 * Se renderiza dentro del `<Popup>` de Leaflet y reutiliza el lenguaje
 * visual de `ProviderCard` (foto editorial con chips flotantes, meta
 * compacta) en un formato más estrecho (~280px) pensado para el mapa.
 *
 * Marcamos `'use client'` porque el CTA opcional usa un handler `onClick`.
 */
export function MapProviderPopup({
  provider,
  onPrimaryAction,
  primaryActionLabel,
}: MapProviderPopupProps) {
  const t = useTranslations('search.card');

  // Foto principal con fallback gris si el proveedor no tiene fotos.
  // En producción esto vendrá siempre relleno, pero el componente debe
  // ser robusto ante data parcial (loading states, mocks, etc.).
  const photoUrl = provider.photos[0];

  return (
    <div className={s.root} data-component="map-provider-popup">
      <div className={s.photoWrapper}>
        {photoUrl ? (
          // Usamos <img> nativo porque las URLs externas no están en la
          // allow-list de next/image todavía (mismo criterio que ProviderCard).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={provider.name}
            loading="lazy"
            decoding="async"
            className={s.photo}
            data-component="map-provider-popup-photo"
          />
        ) : (
          <div className={s.photoFallback} aria-hidden />
        )}
        <span className={s.photoOverlay} aria-hidden />
        <span className={s.badgeOverlay}>
          <AvailabilityBadge
            status={provider.availability.status}
            nextSlotAt={provider.availability.nextSlot?.startAt ?? null}
            variant="solid"
          />
        </span>
        <span className={s.priceChip}>{provider.priceRange}</span>
      </div>

      <div className={s.body}>
        <p className={s.type}>
          {t(provider.type === 'autonomo' ? 'typeAutonomous' : 'typeCenter')}
        </p>
        <h3 className={s.name} data-component="map-provider-popup-name">
          {provider.name}
        </h3>
        <p className={s.address}>{provider.address}</p>

        <div className={s.metaRow}>
          <span className={s.rating}>
            <Star className="size-3.5 fill-current" aria-hidden />
            {provider.rating.toFixed(1)}
          </span>
          <span className={s.separator} aria-hidden>
            ·
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

        {onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className={s.cta}
            data-component="map-provider-popup-cta"
          >
            {primaryActionLabel ?? ''}
          </button>
        )}
      </div>
    </div>
  );
}
