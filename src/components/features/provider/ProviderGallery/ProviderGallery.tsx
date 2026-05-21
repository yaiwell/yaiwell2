'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

import { useProviderGallery } from './ProviderGallery.logic';
import { providerGalleryStyles as s } from './ProviderGallery.styles';
import type { ProviderGalleryProps } from './ProviderGallery.types';

/**
 * Galería de fotos del proveedor.
 *
 * Renderiza dos layouts mutuamente excluyentes con clases responsive
 * (sin duplicar componentes ni montar JS de detección de viewport):
 *
 * - Mobile (`< lg`): carousel horizontal con scroll-snap CSS nativo,
 *   sin librerías externas. Los "dots" y los botones prev/next
 *   actualizan el `scrollLeft` del track, lo que dispara el snap.
 * - Desktop (`lg+`): split con foto principal grande y columna de
 *   thumbnails. Click en thumbnail cambia la foto principal.
 *
 * La elección de scroll-snap CSS evita meter Embla/Swiper en el
 * bundle: el caso de uso es lo bastante simple y el navegador hace
 * el trabajo nativo (incluso el swipe táctil).
 */
export function ProviderGallery({ photos, alt }: ProviderGalleryProps) {
  const { activeIndex, goTo, goNext, goPrev, onKeyDown } = useProviderGallery(photos.length);

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

  return (
    <section
      data-component="provider-gallery"
      role="region"
      aria-label="Galería de fotos"
      className={s.root}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* ---------------- Mobile carousel ---------------- */}
      <div ref={mobileTrackRef} className={s.mobileTrack}>
        {photos.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className={s.mobileSlide}
            data-component={index === activeIndex ? 'provider-gallery-main' : undefined}
          >
            {/* Usamos <img> nativo porque las URLs son externas (Unsplash)
                y next/image requeriría configurar dominios. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
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
            aria-label="Foto anterior"
            data-component="provider-gallery-prev"
          >
            <ChevronLeft className={s.navIcon} aria-hidden />
          </button>
          <button
            type="button"
            onClick={goNext}
            className={s.nextBtn}
            aria-label="Foto siguiente"
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
                  aria-label={`Ir a la foto ${index + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  data-component={`provider-gallery-thumb-${index}`}
                />
              );
            })}
          </div>
        </>
      )}

      {/* ---------------- Desktop split layout ---------------- */}
      <div className={s.desktopGrid}>
        <div className={s.desktopMainWrapper}>
          {/* Renderizamos solo la activa en desktop: el cambio se hace
              por click en thumbnail, no por swipe, así que no hace
              falta mantener el resto en el DOM. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={photos[activeIndex]}
            src={photos[activeIndex]}
            alt={alt}
            loading="eager"
            decoding="async"
            className={s.desktopMainImage}
            data-component="provider-gallery-main"
          />
        </div>

        {photos.length > 1 && (
          <div className={s.thumbsColumn}>
            {photos.slice(0, 4).map((src, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`thumb-${src}-${index}`}
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(s.thumbWrapper, isActive && s.thumbActive)}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  data-component={`provider-gallery-thumb-${index}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={alt} loading="lazy" decoding="async" className={s.thumb} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
