/**
 * Estilos del componente ProviderReviewsSection.
 *
 * Mantenemos las clases Tailwind aquí para que el JSX quede limpio
 * y para poder ajustar la estética de toda la sección en un solo
 * archivo. Evitamos el amber clásico de e-commerce: usamos foreground
 * suave para las barras (estética editorial) y el brand peach para
 * las estrellas, que casan mejor sobre el cream background de Yaiwell.
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
  // Nota media en gigante editorial: tipografía display, sin altura
  // de línea extra y con tracking apretado para que el número respire.
  summaryRatingValue:
    'text-7xl md:text-8xl font-display text-foreground leading-none tracking-[-0.04em]',
  summaryStarIcon: 'h-7 w-7 fill-brand-peach text-brand-peach',
  summaryCount: 'mt-1 text-sm text-muted-foreground',

  // Breakdown — barras en foreground tenue para look editorial premium.
  breakdown: 'flex flex-1 flex-col gap-2',
  breakdownRow: 'flex items-center gap-3 text-sm',
  breakdownLabel: 'w-24 shrink-0 text-muted-foreground',
  breakdownBarTrack: 'flex-1 h-2 rounded-full bg-muted overflow-hidden',
  breakdownBarFill: 'h-full bg-foreground/80 rounded-full transition-[width] duration-300 ease-out',
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
  // Estrellas activas en brand peach para mantener calidez sin caer
  // en el amber de e-commerce; inactivas en foreground muy tenue.
  itemStarActive: 'h-4 w-4 fill-brand-peach text-brand-peach',
  itemStarInactive: 'h-4 w-4 text-foreground/15',
  itemText: 'text-sm text-foreground/90 leading-relaxed',

  // Empty state
  empty:
    'rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground',

  // Botón ver más
  loadMoreWrapper: 'flex justify-center pt-2',
  loadMore:
    'inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
} as const;
