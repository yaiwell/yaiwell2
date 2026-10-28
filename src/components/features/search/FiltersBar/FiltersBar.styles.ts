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
// Disposición:
//  - Mobile (<md): chips en su propia fila scrollable + fila con las
//    dos acciones (toggle "ahora" y botón filtros) justificadas a la
//    derecha. Antes compartían fila y al hacer scroll los chips se
//    apelmazaban contra los iconos.
//  - md+ : todo en una sola fila (chips flex-1, acciones a la derecha).
export const filtersBarStyles = {
  root: 'flex w-full flex-col gap-2 md:flex-row md:items-center',
  chipsScroll:
    'flex w-full md:flex-1 min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  // Wrapper de acciones secundarias (toggle + filtros). En mobile va en
  // su propia fila alineado a la derecha; en md+ vuelve a la fila única.
  // Con cuatro acciones la fila no cabe en 375 px: en móvil scrollea en
  // horizontal (alineada a la izquierda; `justify-end` con overflow deja
  // la parte izquierda inalcanzable) y en md+ vuelve a la derecha. El
  // `pt-1` deja sitio al punto del botón de filtros, que sobresale.
  actions:
    'flex items-center gap-2 overflow-x-auto pt-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-end md:overflow-visible md:p-0',
  chipBase:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  chipIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  chipActive: 'border-primary bg-primary text-primary-foreground',
  toggleNow:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  toggleNowIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  // Par semántico `status-now` (globals.css): ≥ 4.5:1 en claro y oscuro.
  // El par `brand-sage` / `brand-sage-soft` daba solo 2.0:1 en claro
  // (auditoría 2026-10-27, P0 #1).
  toggleNowActive: 'border-status-now-foreground/30 bg-status-now text-status-now-foreground',
  // Chip "Cerca de ti": misma base que los toggles para no romper el ritmo
  // visual de la barra. Cuando está activo usa el par brand-sky para
  // diferenciarlo del "ahora" (sage) y reforzar la metáfora de "ubicación".
  toggleNear:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  toggleNearIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  toggleNearActive: 'border-status-info-foreground/40 bg-status-info text-status-info-foreground',
  // Toggle "Con descuento": misma base; activo con el par de marca.
  toggleOffer:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  toggleOfferIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  toggleOfferActive: 'border-primary bg-primary text-primary-foreground',
  filterButton:
    'relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  filterButtonDot:
    'absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background',
} as const;
