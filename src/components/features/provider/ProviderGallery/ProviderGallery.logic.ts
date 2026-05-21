'use client';

import { useCallback, useState } from 'react';

import type { UseProviderGalleryReturn } from './ProviderGallery.types';

/**
 * Hook que gestiona el estado de navegación de la galería.
 *
 * Centraliza el índice activo, el clamp para evitar overflow y el
 * ciclado en prev/next. Lo extraemos del componente para mantener
 * el JSX puramente presentacional (regla 6.bis del CLAUDE.md).
 *
 * @param photosCount — número total de fotos disponibles.
 * @returns API mínima para que el componente cambie de foto.
 */
export function useProviderGallery(photosCount: number): UseProviderGalleryReturn {
  const [activeIndex, setActiveIndex] = useState(0);

  // Normalizamos siempre a un índice válido. Si photosCount es 0
  // forzamos 0 para no provocar NaN al hacer modulo.
  const clamp = useCallback(
    (index: number) => {
      if (photosCount <= 0) return 0;
      // Modulo positivo: -1 → last, photosCount → 0.
      return ((index % photosCount) + photosCount) % photosCount;
    },
    [photosCount],
  );

  const goTo = useCallback(
    (index: number) => {
      setActiveIndex(clamp(index));
    },
    [clamp],
  );

  const goNext = useCallback(() => {
    setActiveIndex((current) => clamp(current + 1));
  }, [clamp]);

  const goPrev = useCallback(() => {
    setActiveIndex((current) => clamp(current - 1));
  }, [clamp]);

  /**
   * Soporte de teclado: flechas izquierda/derecha cambian foto.
   * El componente padre conecta este handler al elemento focuseable.
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  return { activeIndex, goTo, goNext, goPrev, onKeyDown };
}
