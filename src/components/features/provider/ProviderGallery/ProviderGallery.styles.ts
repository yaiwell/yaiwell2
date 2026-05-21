/**
 * Estilos del componente ProviderGallery.
 *
 * Mantenemos aquí todas las clases Tailwind del componente. El
 * componente expone dos layouts (mobile carousel + desktop split),
 * por eso encontrarás clases con prefijos `lg:` que cambian el modo.
 *
 * Convenciones:
 * - Bordes generosos (`rounded-3xl`) acordes a la estética premium/cálida.
 * - Tokens semánticos (`bg-muted`, `ring-primary`) en lugar de colores
 *   hardcodeados para mantener coherencia con el resto del marketplace.
 * - Botones de navegación con `backdrop-blur` para legibilidad sobre
 *   cualquier foto.
 */
export const providerGalleryStyles = {
  root: 'relative w-full',

  // Mobile: carousel horizontal con scroll-snap. Desktop: oculto (se
  // usa el split layout). El scroll-snap evita necesitar libs externas.
  mobileTrack:
    'flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-3xl bg-muted lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  mobileSlide: 'relative aspect-[4/3] w-full flex-shrink-0 snap-center',
  mobileImage: 'h-full w-full object-cover transition-opacity duration-200 ease-out',

  // Botones prev/next: solo móvil, superpuestos a los lados.
  prevBtn:
    'absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-2 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:inline-flex lg:hidden',
  nextBtn:
    'absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/80 p-2 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:inline-flex lg:hidden',
  navIcon: 'size-5',

  // Dots: barras pequeñas centradas en la parte inferior (solo móvil).
  dotsRow:
    'pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5 lg:hidden',
  dot: 'pointer-events-auto h-1.5 w-4 rounded-full bg-white/50 transition-all duration-200 ease-out hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
  dotActive: 'w-8 bg-white',

  // Desktop: layout split con foto principal + thumbnails.
  desktopGrid: 'hidden gap-3 lg:grid lg:grid-cols-[3fr_2fr]',
  desktopMainWrapper:
    'relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
  desktopMainImage: 'h-full w-full object-cover transition-opacity duration-200 ease-out',
  thumbsColumn: 'grid grid-cols-2 gap-3 lg:grid-cols-1',
  thumbWrapper:
    'relative aspect-square overflow-hidden rounded-2xl bg-muted transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
  thumb: 'h-full w-full object-cover',
  thumbActive: 'ring-2 ring-primary',
} as const;
