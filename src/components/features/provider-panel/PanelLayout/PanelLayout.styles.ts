/**
 * Estilos del layout del panel del proveedor.
 *
 * En desktop usamos un grid de 2 columnas (sidebar + contenido). En
 * mobile la sidebar desaparece y la navegación vive en una bottom tab
 * bar dedicada (`PanelBottomNav`). El padding inferior del contenido
 * en mobile reserva espacio para el bottom tab bar fijo.
 */
export const panelLayoutStyles = {
  root: 'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-0 px-0 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-6 lg:py-8',
  sidebar:
    'hidden flex-col gap-6 rounded-3xl border border-border/60 bg-card p-6 lg:flex lg:sticky lg:top-24 lg:h-[calc(100dvh-7rem)]',
  sidebarHeader: 'flex flex-col gap-1',
  sidebarKicker: 'text-xs font-medium tracking-wide text-muted-foreground uppercase',
  sidebarTitle: 'font-display text-lg text-foreground',
  sidebarProvider: 'text-sm text-foreground/70',
  sidebarNav: 'flex flex-col gap-1',

  // Footer de la sidebar: alberga el toggle "Ver como cliente". El
  // `mt-auto` lo empuja al fondo de la columna flex de la sidebar para
  // que los links de navegación queden agrupados arriba y la acción
  // secundaria (salir a modo cliente) viva separada visualmente.
  sidebarFooter: 'mt-auto flex flex-col gap-2 border-t border-border/40 pt-4',
  sidebarSwitchForm: 'flex',
  sidebarSwitchButton:
    'inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',

  sidebarLink:
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  sidebarLinkActive: 'bg-primary/10 text-foreground',
  sidebarLinkIcon: 'size-4 shrink-0',

  content: 'flex flex-1 flex-col gap-6 px-4 py-6 pb-32 sm:px-6 lg:px-0 lg:py-0 lg:pb-12',

  // Bottom tab bar (solo mobile). Se separa del MobileNav global para no
  // tapar la navegación principal de la app — vive justo encima.
  bottomNav:
    'fixed bottom-20 left-0 right-0 z-20 mx-auto flex max-w-md items-center justify-around gap-1 rounded-full border border-border/60 bg-background/95 px-2 py-2 shadow-lg backdrop-blur lg:hidden',
  bottomNavLink:
    'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95',
  bottomNavLinkActive: 'bg-primary/10 text-foreground',
  bottomNavIcon: 'size-4',
} as const;
