/**
 * Estilos de la sección «Huecos libres en las próximas 2 h».
 * Mismo lenguaje de tarjetas que el listado de reservas del panel.
 */
export const freeSlotsSectionStyles = {
  root: 'flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm',
  header: 'flex flex-col gap-1',
  title: 'font-display text-lg text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  empty: 'text-sm text-muted-foreground',
  list: 'flex flex-col divide-y divide-border/60',
  item: 'flex flex-wrap items-center justify-between gap-2 py-2',
  itemMain: 'flex min-w-0 flex-col',
  itemTime: 'text-sm font-medium tabular-nums text-foreground',
  itemService: 'truncate text-sm text-muted-foreground',
  more: 'text-xs text-muted-foreground',
} as const;
