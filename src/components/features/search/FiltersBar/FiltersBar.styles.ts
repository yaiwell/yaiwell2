/**
 * Estilos de la barra de filtros principales.
 *
 * Disposición:
 *  - chips de categorías raíz (scrollable horizontal en móvil).
 *  - toggle "solo ahora" (chip destacado en sage cuando activo).
 *  - botón "Filtros" que abre el sheet.
 *
 * Paleta semántica (sin `stone-*`) para mantener coherencia con landing.
 */
export const filtersBarStyles = {
  root: 'flex w-full items-center gap-2',
  chipsScroll:
    'flex flex-1 min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  chipBase:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  chipIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  chipActive: 'border-primary bg-primary text-primary-foreground',
  toggleNow:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  toggleNowIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  toggleNowActive: 'border-brand-sage/40 bg-brand-sage-soft text-[oklch(0.32_0.06_145)]',
  filterButton:
    'relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  filterButtonDot:
    'absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background',
} as const;
