/**
 * Estilos de BookingCard.
 *
 * Card horizontal con foto del proveedor + bloque informativo y pie
 * de acciones. Mantiene la línea editorial (radios grandes, sombras
 * suaves, paleta stone via tokens semánticos).
 */
export const bookingCardStyles = {
  root: 'group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:shadow-md sm:flex-row',
  imageWrapper: 'relative aspect-[16/10] w-full overflow-hidden bg-muted sm:aspect-auto sm:w-48',
  image: 'h-full w-full object-cover',
  body: 'flex flex-1 flex-col gap-3 p-5',
  headerRow: 'flex flex-wrap items-start justify-between gap-3',
  serviceName: 'font-display text-lg leading-tight text-foreground',
  providerLine: 'text-sm text-muted-foreground',
  meta: 'flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/80',
  metaItem: 'inline-flex items-center gap-1.5',
  metaIcon: 'size-4 text-muted-foreground',
  notes: 'rounded-2xl bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground',
  footer:
    'mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4',
  price: 'text-sm font-semibold text-foreground',
  actions: 'flex flex-wrap items-center gap-2',
  statusBase:
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
  statusPending: 'bg-amber-50 text-amber-800 ring-amber-200',
  statusConfirmed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  statusCompleted: 'bg-stone-100 text-stone-700 ring-stone-200',
  statusCancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  statusRefunded: 'bg-sky-50 text-sky-700 ring-sky-200',
  blockedHint: 'text-xs text-muted-foreground',
} as const;
