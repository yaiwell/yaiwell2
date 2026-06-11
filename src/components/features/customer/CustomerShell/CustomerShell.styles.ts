/**
 * Estilos del shell del área cliente.
 *
 * Layout responsive:
 *  - Móvil: topbar con el avatar + título; navegación en chips
 *    horizontales scrollables debajo.
 *  - Desktop: sidebar fijo a la izquierda (192px) con avatar arriba
 *    y nav vertical. Contenido principal a la derecha.
 */
export const customerShellStyles = {
  root: 'mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-10 md:py-10',
  sidebar:
    'flex shrink-0 flex-col gap-6 rounded-3xl border border-border/60 bg-card/60 p-5 md:sticky md:top-24 md:w-60 md:self-start md:p-6',
  identityRow: 'flex items-center gap-3',
  avatar:
    'inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary font-medium',
  avatarImage: 'size-full object-cover',
  identityInfo: 'flex min-w-0 flex-col',
  identityName: 'truncate font-display text-base leading-tight text-foreground',
  identityRole: 'truncate text-xs uppercase tracking-wider text-muted-foreground',
  nav: 'flex gap-2 overflow-x-auto md:flex-col md:overflow-visible',
  navItem:
    'inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-sm text-foreground/80 transition-colors duration-150 hover:border-border hover:text-foreground focus-visible:border-border focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] md:rounded-2xl md:px-3.5',
  navItemActive: 'border-primary/30 bg-primary/10 text-primary hover:text-primary',
  // Items pendientes de implementar (Fase 1). Visualmente apagados, sin
  // hover, cursor not-allowed, y con un chip "Próximamente" al lado.
  navItemDisabled:
    'inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-full border border-border/40 bg-background/40 px-3 py-2 text-sm text-muted-foreground md:rounded-2xl md:px-3.5',
  navItemComingSoon:
    'ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
  navIcon: 'size-4',
  main: 'flex flex-1 flex-col gap-6',
  pageHeader: 'flex flex-col gap-2',
  pageTitle: 'font-display text-3xl leading-tight text-foreground sm:text-4xl',
  pageSubtitle: 'max-w-xl text-sm text-muted-foreground',
} as const;
