/**
 * Estilos de la valoración propia que se muestra en la card.
 */
export const existingReviewStyles = {
  root: 'flex flex-col gap-1.5 rounded-2xl bg-muted/60 px-3 py-2.5',
  header: 'flex flex-wrap items-center gap-2 text-xs font-medium text-foreground',
  stars: 'inline-flex items-center gap-0.5',
  // Mismo ocre que `RatingSummary`; la estrella vacía queda en borde neutro.
  starFilled: 'size-3.5 fill-status-soon-foreground stroke-status-soon-foreground',
  starEmpty: 'size-3.5 fill-transparent stroke-muted-foreground',
  text: 'text-xs leading-relaxed whitespace-pre-line text-muted-foreground',
  toggle:
    'w-fit rounded text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
} as const;
