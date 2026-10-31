/**
 * Estilos de la barra de filtros principales.
 *
 * Disposición (ver JSDoc de `FiltersBar`):
 *  - Móvil: una fila deslizable (toggles · separador · categorías) con un
 *    degradado a la derecha que avisa de que hay más, y «Filtros» fijo.
 *  - md+: `scroller` pasa a `md:contents` y sus hijos se ordenan con
 *    `order` dentro de la fila: categorías (flex-1, deslizables),
 *    toggles y «Filtros».
 *
 * Paleta semántica (sin `stone-*`) para mantener coherencia con landing.
 */
export const filtersBarStyles = {
  root: 'flex w-full flex-col gap-2',
  row: 'flex w-full items-center gap-2',
  scroller:
    'flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] md:contents',
  toggles: 'flex shrink-0 items-center gap-2 md:order-2',
  divider: 'h-6 w-px shrink-0 bg-border md:hidden',
  // El `pr-6` deja el último chip fuera del degradado al llegar al final.
  categories:
    'flex shrink-0 items-center gap-2 pr-6 md:order-1 md:min-w-0 md:flex-1 md:overflow-x-auto md:pr-0 md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden',
  chipBase:
    'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-wait',
  chipIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  chipActive: 'border-primary bg-primary text-primary-foreground',
  icon: 'size-4',
  spin: 'animate-spin',
  // Par semántico `status-now` (globals.css): ≥ 4.5:1 en claro y oscuro.
  // El par `brand-sage` / `brand-sage-soft` daba solo 2.0:1 en claro
  // (auditoría 2026-10-27, P0 #1).
  toggleNowActive: 'border-status-now-foreground/30 bg-status-now text-status-now-foreground',
  // «Cerca de ti» activo usa el par `status-info` para diferenciarlo del
  // «ahora» y reforzar la metáfora de ubicación (igual que la pill de la
  // cabecera cuando la ubicación está activa).
  toggleNearActive: 'border-status-info-foreground/40 bg-status-info text-status-info-foreground',
  // «Con descuento» solo desde `md`: en móvil vive en el sheet de filtros.
  toggleOffer: 'hidden md:inline-flex',
  toggleOfferActive: 'border-primary bg-primary text-primary-foreground',
  // En móvil «Filtros» es un botón redondo de solo icono; desde md lleva texto.
  filterButton:
    'relative inline-flex size-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-card text-sm text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 md:order-3 md:h-9 md:w-auto md:px-3.5',
  filterButtonLabel: 'sr-only md:not-sr-only',
  filterButtonDot:
    'absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background',
  // Punto cuando lo único activo del sheet es "Con descuento": en md+ ese
  // filtro se ve en la barra y el sheet no lo enseña, así que el punto
  // solo tiene sentido en móvil.
  filterButtonDotMobileOnly: 'md:hidden',
  hint: 'text-xs text-muted-foreground',
} as const;
