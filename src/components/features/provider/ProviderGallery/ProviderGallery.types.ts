/**
 * Tipos específicos del componente ProviderGallery.
 *
 * Los tipos compartidos del dominio (Provider, Photo, etc.) viven
 * en /types/domain.ts. Aquí solo declaramos el contrato del componente.
 */

export interface ProviderGalleryProps {
  /** URLs de las fotos a mostrar. Si solo hay una, se ocultan dots y botones. */
  photos: string[];
  /** Texto alternativo común a todas las imágenes (nombre del proveedor). */
  alt: string;
}

export interface UseProviderGalleryReturn {
  activeIndex: number;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}
