/**
 * Estilos de la vista de valoraciones recibidas en el panel.
 *
 * Tres bloques: cabecera con resumen, barra de filtros, listado de
 * reseñas en formato tarjeta. Cada reseña destaca la nota con estrellas
 * y muestra opcionalmente la respuesta del centro.
 */
export const receivedReviewsStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  summary: 'text-sm text-foreground/70',

  filters:
    'flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between',
  filterGroup: 'flex flex-col gap-1.5 sm:flex-1',
  filterLabel: 'text-xs font-medium text-muted-foreground',
  select:
    'h-9 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  toggleRow: 'flex items-center gap-2 sm:self-end',
  toggleLabel: 'text-sm text-foreground',

  list: 'flex flex-col gap-3',
  empty:
    'rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground',

  card: 'flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm',
  cardHeader: 'flex flex-wrap items-center justify-between gap-2',
  cardAuthor: 'flex items-center gap-2 text-sm font-semibold text-foreground',
  cardMeta: 'text-xs text-muted-foreground',
  starsRow: 'flex items-center gap-0.5',
  starFilled: 'size-4 fill-amber-400 stroke-amber-400',
  starEmpty: 'size-4 fill-transparent stroke-border',

  cardServiceTag:
    'inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80',
  cardText: 'text-sm leading-relaxed text-foreground',

  responseBox: 'rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm text-foreground/90',
  responseTitle: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  responseText: 'mt-1 text-sm text-foreground/80',
  pendingBadge:
    'inline-flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800',
  respondedBadge:
    'inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700',
  cardActions: 'flex items-center justify-end',
} as const;
