/**
 * Estilos de la barra de navegación inter-secciones de la ficha.
 * Solo visible en mobile/tablet (< lg); en desktop el scroll lineal
 * con secciones espaciadas es suficiente y la barra estorba.
 */
export const providerDetailNavStyles = {
  // Sticky justo debajo del header global (sticky a su vez en ~64px).
  root: 'sticky top-16 z-30 -mx-4 mb-4 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/85 px-4 py-2 backdrop-blur lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  tab: 'inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
  tabActive: 'bg-foreground text-background hover:text-background',
} as const;
