/**
 * Estilos de la barra de navegación inter-secciones de la ficha.
 * Solo visible en mobile/tablet (< lg); en desktop el scroll lineal
 * con secciones espaciadas es suficiente y la barra estorba.
 *
 * Apostamos por tabs con underline (estética editorial) en vez de pills:
 * más limpio, más premium, menos ruidoso visualmente.
 */
export const providerDetailNavStyles = {
  // Sticky justo debajo del header global (sticky a su vez en ~64px).
  // El contenedor es una barra inferior tenue sobre la que descansan
  // los tabs; el backdrop blur evita que el contenido se trasluzca.
  root: 'sticky top-16 z-30 -mx-4 mb-2 flex items-center gap-6 overflow-x-auto border-b border-foreground/10 bg-background/95 px-4 pt-3 backdrop-blur lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  tab: 'inline-flex shrink-0 items-center border-b-2 border-transparent pb-2.5 pt-1 text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground',
  tabActive: 'border-foreground text-foreground',
} as const;
