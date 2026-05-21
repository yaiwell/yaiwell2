/**
 * Estilos del componente ProviderReviewsSection.
 *
 * Mantenemos las clases Tailwind aquí para que el JSX quede limpio
 * y para poder ajustar la estética de toda la sección en un solo
 * archivo. Las paletas siguen los tokens de la marca (muted, amber).
 */
export const providerReviewsSectionStyles = {
  section: 'flex flex-col gap-6 py-8 md:py-12',

  // Encabezado de sección
  heading: 'text-2xl md:text-3xl font-display text-foreground',

  // Bloque de resumen (nota grande + breakdown)
  summary:
    'flex flex-col gap-6 rounded-2xl bg-muted/40 p-6 md:flex-row md:items-start md:gap-10 md:p-8',
  summaryLeft: 'flex flex-col items-start gap-1 md:min-w-[180px]',
  summaryRating: 'flex items-baseline gap-2',
  summaryRatingValue: 'text-5xl font-display text-foreground leading-none',
  summaryStarIcon: 'h-7 w-7 fill-amber-400 text-amber-400',
  summaryCount: 'mt-1 text-sm text-muted-foreground',

  // Breakdown
  breakdown: 'flex flex-1 flex-col gap-2',
  breakdownRow: 'flex items-center gap-3 text-sm',
  breakdownLabel: 'w-24 shrink-0 text-muted-foreground',
  breakdownBarTrack: 'flex-1 h-2 rounded-full bg-muted overflow-hidden',
  breakdownBarFill: 'h-full bg-amber-400 rounded-full transition-[width] duration-300 ease-out',
  breakdownValue: 'w-10 shrink-0 text-right tabular-nums text-muted-foreground',

  // Lista de reseñas
  list: 'flex flex-col gap-6',
  item: 'flex flex-col gap-3 border-b border-border/60 pb-6 last:border-b-0 last:pb-0',
  itemHeader: 'flex items-start gap-3',
  avatar:
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
  itemMeta: 'flex flex-col gap-0.5',
  itemAuthor: 'text-sm font-medium text-foreground',
  itemDate: 'text-xs text-muted-foreground',
  itemStars: 'mt-1 flex items-center gap-0.5',
  itemStarActive: 'h-4 w-4 fill-amber-500 text-amber-500',
  itemStarInactive: 'h-4 w-4 text-muted-foreground/30',
  itemText: 'text-sm text-foreground/90 leading-relaxed',

  // Empty state
  empty:
    'rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground',

  // Botón ver más
  loadMoreWrapper: 'flex justify-center pt-2',
  loadMore:
    'inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted',
} as const;
