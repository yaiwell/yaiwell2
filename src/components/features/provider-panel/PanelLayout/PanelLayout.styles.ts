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
    'inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-muted px-4 py-2.5 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',

  sidebarLink:
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  sidebarLinkActive: 'bg-primary/10 text-foreground',
  sidebarLinkIcon: 'size-4 shrink-0',

  // `pb` reserva el alto de la barra inferior (+ safe area) en móvil.
  content:
    'flex flex-1 flex-col gap-6 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-0 lg:py-0 lg:pb-12',

  // Bottom tab bar (solo mobile). Bajo `/panel` el MobileNav global se
  // oculta, así que esta barra ocupa su sitio: pegada al borde inferior,
  // a todo el ancho y respetando la zona del home indicator de iOS. Antes
  // flotaba a `bottom-20` (heredado de cuando convivía con la global).
  bottomNav:
    'fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:hidden',
  // `grid-cols-5` reparte el ancho a partes iguales; con `min-w-0` en los
  // enlaces, una etiqueta larga («Valoraciones», «Mein Geschäft») baja a
  // dos líneas en lugar de empujar y pisar a la de al lado.
  bottomNavInner:
    'mx-auto grid max-w-md grid-cols-5 gap-1 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]',
  bottomNavLink:
    'flex min-h-11 min-w-0 flex-col items-center justify-start gap-1 rounded-2xl px-0.5 py-1.5 text-center text-[10px] leading-tight font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95',
  bottomNavLinkActive: 'bg-primary/10 text-foreground',
  bottomNavIcon: 'size-5 shrink-0',
  bottomNavLabel: 'w-full break-words hyphens-auto',
} as const;
