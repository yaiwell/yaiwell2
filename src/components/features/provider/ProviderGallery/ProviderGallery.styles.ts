/**
 * Estilos del componente ProviderGallery.
 *
 * El componente expone dos layouts mutuamente excluyentes encapsulados
 * cada uno en su propio contenedor con `relative`/`absolute` aislados,
 * para evitar que los controles absolutos del mobile se solapen con el
 * grid de desktop. Cada layout se muestra mediante visibilidad
 * responsive (`lg:hidden` / `hidden lg:block`).
 *
 * Convenciones:
 * - Bordes generosos (`rounded-3xl`) acordes a la estética premium/cálida.
 * - Tokens semánticos (`bg-muted`, `ring-primary`) en lugar de colores
 *   hardcodeados para mantener coherencia con el resto del marketplace.
 * - Botones de navegación con `backdrop-blur` para legibilidad sobre
 *   cualquier foto.
 */
export const providerGalleryStyles = {
  root: 'w-full',

  // -------- Mobile container --------
  // Wrapper aislado del carousel + sus controles absolutos. `relative`
  // aquí garantiza que los botones prev/next y los dots se posicionen
  // exclusivamente respecto al carousel y no respecto al grid desktop.
  mobileWrapper: 'relative w-full lg:hidden',
  mobileTrack:
    'flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-3xl bg-muted shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  // Aspect-ratio fijado en el slide; height explícita via aspect ratio
  // de width 100%. `aspect-[4/3]` calcula altura a partir del ancho, lo
  // que evita el bug de colapso vertical dentro de flex containers.
  mobileSlide: 'relative aspect-[4/3] w-full flex-shrink-0 snap-center overflow-hidden',
  mobileImage: 'absolute inset-0 h-full w-full object-cover',

  // Botones prev/next: solo móvil/tablet, superpuestos a los lados.
  // Usamos `bg-card` (claro en light, oscuro en dark) sobre la foto, con
  // `text-foreground` para contraste correcto en ambos temas.
  // `min-h-11 min-w-11` para cumplir el touch target de 44px (WCAG / Apple
  // HIG; audit 2026-05-27 §B.6).
  prevBtn:
    'absolute left-3 top-1/2 z-10 hidden min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/85 p-2.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:inline-flex',
  nextBtn:
    'absolute right-3 top-1/2 z-10 hidden min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/85 p-2.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:inline-flex',
  navIcon: 'size-5',

  // Dots: barras pequeñas centradas en la parte inferior. Sobre la foto
  // mantenemos un tono claro fijo (card) para asegurar visibilidad
  // independientemente del tema.
  dotsRow:
    'pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5',
  dot: 'pointer-events-auto h-1.5 w-4 rounded-full bg-card/55 transition-all duration-200 ease-out hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
  dotActive: 'w-8 bg-card',

  // -------- Desktop container --------
  // Composición "hero" premium: foto principal grande a la izquierda
  // (~ratio 3:2) y grid 2x2 de miniaturas a la derecha. Aislado del
  // mobile para no compartir contexto absolute.
  desktopWrapper: 'hidden w-full lg:block',
  desktopGrid: 'grid grid-cols-[3fr_2fr] gap-3',
  desktopMainWrapper:
    'relative aspect-[3/2] overflow-hidden rounded-3xl bg-muted shadow-sm focus-within:ring-2 focus-within:ring-primary/60',
  desktopMainImage:
    'absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out',
  thumbsColumn: 'grid grid-cols-2 grid-rows-2 gap-3',
  thumbWrapper:
    'relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
  thumb: 'absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out',
  thumbActive: 'ring-2 ring-primary',
  thumbHoverable: 'hover:scale-[1.03]',
} as const;
