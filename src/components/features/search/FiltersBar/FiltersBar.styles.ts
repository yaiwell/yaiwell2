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
  actions: 'flex items-center justify-end gap-2',
  chipBase:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  chipIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  chipActive: 'border-primary bg-primary text-primary-foreground',
  toggleNow:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  toggleNowIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  // Texto en `text-brand-sage` (no hardcoded sage oscuro): el par
  // `*-soft` / `*` se invierte automáticamente en dark, asegurando AA
  // tanto en light (texto sage oscuro sobre fondo sage claro) como en
  // dark (texto sage claro sobre fondo sage oscuro).
  toggleNowActive: 'border-brand-sage/40 bg-brand-sage-soft text-brand-sage',
  // Chip "Cerca de ti": misma base que los toggles para no romper el ritmo
  // visual de la barra. Cuando está activo usa el par brand-sky para
  // diferenciarlo del "ahora" (sage) y reforzar la metáfora de "ubicación".
  toggleNear:
    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  toggleNearIdle: 'border-border bg-card text-foreground/80 hover:bg-muted',
  toggleNearActive: 'border-brand-sky/40 bg-brand-sky-soft text-brand-sky',
  filterButton:
    'relative inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  filterButtonDot:
    'absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background',
} as const;
