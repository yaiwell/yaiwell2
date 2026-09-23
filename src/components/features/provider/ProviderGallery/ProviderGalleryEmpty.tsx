'use client';

import { useTranslations } from 'next-intl';

import { PhotoPlaceholder } from '@/components/shared/PhotoPlaceholder';

import { providerGalleryStyles as s } from './ProviderGallery.styles';

/**
 * Estado vacío de la galería: el proveedor todavía no tiene fotos.
 *
 * Es el estado normal de cualquier centro recién dado de alta, porque
 * el wizard de onboarding aún no incluye el paso de fotos. Renderizamos
 * un único bloque con el placeholder y **ningún control**: flechas,
 * dots y miniaturas navegarían a la nada.
 *
 * Vive en su propio archivo para que `ProviderGallery.tsx` siga siendo
 * solo composición del caso con fotos (regla 6.bis).
 */
export function ProviderGalleryEmpty() {
  const t = useTranslations('providerGallery');

  return (
    <section
      data-component="provider-gallery"
      data-state="empty"
      role="region"
      aria-label={t('galleryLabel')}
      className={s.root}
    >
      <div className={s.emptyWrapper}>
        <PhotoPlaceholder
          label={t('noPhotos')}
          size="lg"
          dataComponent="provider-gallery-placeholder"
        />
      </div>
    </section>
  );
}
