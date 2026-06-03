'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

import { useProviderGallery } from './ProviderGallery.logic';
import { providerGalleryStyles as s } from './ProviderGallery.styles';
import type { ProviderGalleryProps } from './ProviderGallery.types';

/**
 * Galería de fotos del proveedor.
 *
 * Renderiza dos layouts mutuamente excluyentes en wrappers separados
 * para evitar que los controles absolutos del mobile se solapen con
 * la composición desktop:
 *
 * - Mobile (`< lg`): carousel horizontal con scroll-snap CSS nativo,
 *   sin librerías externas. Los "dots" y los botones prev/next
 *   actualizan el `scrollLeft` del track, lo que dispara el snap.
 * - Desktop (`lg+`): split "hero" con foto principal grande a la
 *   izquierda (aspect 3:2) y grid 2x2 de miniaturas a la derecha.
 *   Click en miniatura cambia la principal con transición de opacidad.
 *
 * La elección de scroll-snap CSS evita meter Embla/Swiper en el
 * bundle: el caso de uso es lo bastante simple y el navegador hace
 * el trabajo nativo (incluso el swipe táctil).
 */
export function ProviderGallery({ photos, alt }: ProviderGalleryProps) {
  const { activeIndex, goTo, goNext, goPrev, onKeyDown } = useProviderGallery(photos.length);
  const t = useTranslations('providerGallery');

  // Referencia al track móvil para sincronizar el scroll cuando el
  // usuario cambia de foto mediante dots, botones o teclado.
  const mobileTrackRef = useRef<HTMLDivElement | null>(null);

  // Cuando activeIndex cambia, desplazamos el track para que el
  // slide correspondiente quede centrado en pantalla.
  useEffect(() => {
    const track = mobileTrackRef.current;
    if (!track) return;
    const slide = track.children[activeIndex] as HTMLElement | undefined;
    if (!slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
  }, [activeIndex]);

  const showControls = photos.length > 1;
  // Lista de miniaturas desktop: hasta 4 para que el grid 2x2 quede
  // siempre completo visualmente.
  const desktopThumbs = photos.slice(0, 4);

  return (
    <section
      data-component="provider-gallery"
      role="region"
      aria-label={t('galleryLabel')}
      className={s.root}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* ---------------- Mobile carousel ---------------- */}
      <div className={s.mobileWrapper}>
        <div ref={mobileTrackRef} className={s.mobileTrack}>
          {photos.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={s.mobileSlide}
              data-component={index === activeIndex ? 'provider-gallery-main' : undefined}
            >
              {/* next/image con `fill` + sizes para que el navegador
                  descargue la variante adecuada por viewport. El hostname
                  externo (Unsplash) está registrado en next.config.ts. */}
              <Image
                src={src}
                alt={alt}
                fill
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 60vw"
                className={s.mobileImage}
              />
            </div>
          ))}
        </div>

        {showControls && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className={s.prevBtn}
              aria-label={t('prev')}
              data-component="provider-gallery-prev"
            >
              <ChevronLeft className={s.navIcon} aria-hidden />
            </button>
            <button
              type="button"
              onClick={goNext}
              className={s.nextBtn}
              aria-label={t('next')}
              data-component="provider-gallery-next"
            >
              <ChevronRight className={s.navIcon} aria-hidden />
            </button>

            <div className={s.dotsRow}>
              {photos.map((_, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={`dot-${index}`}
                    type="button"
                    onClick={() => goTo(index)}
                    className={cn(s.dot, isActive && s.dotActive)}
                    aria-label={t('goToPhoto', { index: index + 1 })}
                    aria-current={isActive ? 'true' : undefined}
                    data-component={`provider-gallery-thumb-${index}`}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ---------------- Desktop split layout ---------------- */}
      <div className={s.desktopWrapper}>
        <div className={s.desktopGrid}>
          <div className={s.desktopMainWrapper}>
            {/* Renderizamos solo la activa en desktop: el cambio se hace
                por click en thumbnail, no por swipe, así que no hace
                falta mantener el resto en el DOM. La `key` fuerza un
                re-mount para que el navegador anime la transición de
                opacidad sin acumular imágenes invisibles. */}
            <Image
              key={photos[activeIndex]}
              src={photos[activeIndex]}
              alt={alt}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className={s.desktopMainImage}
              data-component="provider-gallery-main"
            />
          </div>

          {desktopThumbs.length > 1 && (
            <div className={s.thumbsColumn}>
              {desktopThumbs.map((src, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={`thumb-${src}-${index}`}
                    type="button"
                    onClick={() => goTo(index)}
                    className={cn(s.thumbWrapper, s.thumbHoverable, isActive && s.thumbActive)}
                    aria-label={t('viewPhoto', { index: index + 1 })}
                    aria-current={isActive ? 'true' : undefined}
                    data-component={`provider-gallery-thumb-${index}`}
                  >
                    {/* Miniatura desktop: next/image con `fill` y `sizes`
                        ajustados al ancho real de la columna (≈20vw en lg+).
                        Lazy por defecto al estar fuera del primer viewport. */}
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      sizes="(min-width: 1024px) 20vw, 30vw"
                      className={s.thumb}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
