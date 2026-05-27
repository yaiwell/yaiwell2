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
  // Badges de estado usando los pasteles de marca para que sigan teniendo
  // semántica de color en modo oscuro sin perder contraste.
  statusPending: 'bg-brand-butter-soft text-brand-butter ring-brand-butter/30',
  statusConfirmed: 'bg-brand-sage-soft text-brand-sage ring-brand-sage/30',
  statusCompleted: 'bg-brand-sky-soft text-brand-sky ring-brand-sky/30',
  statusCancelled: 'bg-destructive/15 text-destructive ring-destructive/30',
  statusRefunded: 'bg-muted text-muted-foreground ring-border',
  blockedHint: 'text-xs text-muted-foreground',
} as const;
