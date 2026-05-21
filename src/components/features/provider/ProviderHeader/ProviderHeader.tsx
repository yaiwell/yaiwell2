import { MapPin, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AvailabilityBadge } from '@/components/features/search/AvailabilityBadge';
import { Link } from '@/i18n/navigation';

import { getMinutesUntilNextSlot } from './ProviderHeader.logic';
import { providerHeaderStyles as s } from './ProviderHeader.styles';
import type { ProviderHeaderProps } from './ProviderHeader.types';

/**
 * Cabecera de la ficha de proveedor.
 *
 * Renderiza un breadcrumb editorial, el bloque principal con el tipo
 * (autónomo/centro), nombre y dirección, y una columna derecha con la
 * disponibilidad, el rango de precio y la valoración.
 *
 * Es un Server Component: sin estado ni eventos, solo composición.
 *
 * @param provider — proveedor enriquecido con su disponibilidad.
 */
export function ProviderHeader({ provider }: ProviderHeaderProps) {
  const t = useTranslations('providerDetail.header');
  const tBreadcrumb = useTranslations('providerDetail.breadcrumb');

  // Minutos hasta el próximo slot: la lógica vive en un módulo aparte
  // porque `Date.now()` no puede llamarse durante el render (purity).
  const minutesUntilNext = getMinutesUntilNextSlot(provider);

  return (
    <header className={s.root} data-component="provider-header">
      {/* Breadcrumb: en móvil se oculta el primer crumb (Inicio) para
          ahorrar espacio y empezar directamente en "Buscar". */}
      <nav
        aria-label={tBreadcrumb('home')}
        className={s.breadcrumb}
        data-component="provider-header-breadcrumb"
      >
        <ol className={s.breadcrumbList}>
          <li className={`${s.breadcrumbItem} hidden sm:inline-flex`}>
            <Link href="/" className={s.breadcrumbLink}>
              {tBreadcrumb('home')}
            </Link>
            <span className={`${s.breadcrumbSeparator} ms-1.5`} aria-hidden>
              ›
            </span>
          </li>
          <li className={s.breadcrumbItem}>
            <Link href="/buscar" className={s.breadcrumbLink}>
              {tBreadcrumb('search')}
            </Link>
            <span className={`${s.breadcrumbSeparator} ms-1.5`} aria-hidden>
              ›
            </span>
          </li>
          <li className={`${s.breadcrumbItem} ${s.breadcrumbCurrent}`} aria-current="page">
            {provider.name}
          </li>
        </ol>
      </nav>

      <div className={s.headerRow}>
        {/* Columna izquierda: identidad del proveedor. */}
        <div className={s.leftCol}>
          <span className={s.type} data-component="provider-header-type">
            {t(provider.type === 'autonomo' ? 'typeAutonomous' : 'typeCenter')}
          </span>
          <h1 className={s.name} data-component="provider-header-name">
            {provider.name}
          </h1>
          <p className={s.address} data-component="provider-header-address">
            <MapPin className={s.addressIcon} aria-hidden />
            {provider.address}
          </p>
        </div>

        {/* Columna derecha: estado, precio y valoración. */}
        <div className={s.rightCol}>
          <span className={s.availabilityWrapper} data-component="provider-header-availability">
            <AvailabilityBadge
              status={provider.availability.status}
              minutesUntilNext={minutesUntilNext}
            />
          </span>

          <span className={s.priceRange} data-component="provider-header-price-range">
            {provider.priceRange}
          </span>

          <div
            className={s.ratingRow}
            role="group"
            aria-label="Valoración"
            data-component="provider-header-rating"
          >
            <span className={s.rating}>
              <Star className={s.ratingStar} aria-hidden />
              {provider.rating.toFixed(1)}
            </span>
            <span className={s.reviews}>{t('reviewsLabel', { count: provider.reviewsCount })}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
