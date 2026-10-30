/**
 * Estilos de la pantalla de sanciones de soporte. Mismo lenguaje sobrio
 * que la cola de reembolsos: herramienta interna, sin marca.
 */
export const sanctionsListStyles = {
  root: 'flex flex-col gap-6',
  filter: 'flex flex-col gap-2 sm:flex-row sm:items-end',
  filterLabel:
    'flex flex-1 flex-col gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground',
  filterInput:
    'h-10 rounded-xl border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  filterButton:
    'inline-flex h-10 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  empty:
    'rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground',
  list: 'flex flex-col gap-3',
  item: 'flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-4 md:flex-row md:items-start md:justify-between',
  details: 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm',
  term: 'text-muted-foreground',
  value: 'break-words text-foreground',
  mono: 'break-all font-mono text-xs text-foreground',
} as const;
