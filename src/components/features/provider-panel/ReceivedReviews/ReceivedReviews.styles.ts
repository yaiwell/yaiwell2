/**
 * Estilos de la vista de valoraciones recibidas en el panel.
 *
 * Tres bloques: cabecera con resumen, barra de filtros, listado de
 * reseñas en formato tarjeta. La zona de respuesta (badge de pendiente,
 * card de respuesta publicada, formulario) vive en `ReviewReplyForm`
 * con sus propios estilos para no acoplar ambos componentes.
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
  starFilled: 'size-4 fill-brand-butter stroke-brand-butter',
  starEmpty: 'size-4 fill-transparent stroke-border',

  cardServiceTag:
    'inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80',
  cardText: 'text-sm leading-relaxed text-foreground',
} as const;
