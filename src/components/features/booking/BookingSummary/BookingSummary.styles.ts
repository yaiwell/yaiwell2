/**
 * Estilos del paso de resumen previo al pago.
 */
export const bookingSummaryStyles = {
  root: 'flex flex-col gap-5',

  // Bloque "centro y servicio".
  providerBlock: 'flex items-start gap-4',
  providerImageWrapper:
    'relative size-16 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border',
  providerImage: 'h-full w-full object-cover',
  providerMeta: 'flex flex-col gap-0.5',
  providerName: 'font-display text-lg text-foreground',
  providerAddress: 'text-xs text-muted-foreground',

  // Lista de filas (servicio, fecha, hora, profesional, total).
  list: 'flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4',
  row: 'flex items-start justify-between gap-4',
  rowLabel: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  rowValue: 'text-sm text-foreground text-right',
  rowValueStrong: 'text-sm font-semibold text-foreground text-right',

  // Notas opcionales.
  notesBlock: 'flex flex-col gap-2',
  notesLabel: 'text-sm font-medium text-foreground',
  notesHelper: 'text-xs text-muted-foreground',
  notesTextarea:
    'min-h-[88px] resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',

  // Bloque de política breve (cancelación 2h, etc.).
  policyBlock:
    'flex flex-col gap-1 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground',
  policyTitle: 'text-xs font-medium uppercase tracking-wide text-foreground',
} as const;
