/**
 * Estilos del componente `ReviewReplyForm`.
 *
 * Reutilizamos la paleta visual de `ReceivedReviews` (card de respuesta,
 * badges) para que el bloque se integre sin saltos visuales en el
 * listado de reseñas.
 */
export const reviewReplyFormStyles = {
  root: 'flex flex-col gap-2',

  // Respuesta ya publicada (modo "sin botón").
  responseBox: 'rounded-2xl border border-border/40 bg-muted/30 p-3 text-sm text-foreground/90',
  responseHeader: 'flex flex-wrap items-center justify-between gap-2',
  responseTitle: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  responseDate: 'text-xs text-muted-foreground',
  responseText: 'mt-1 text-sm text-foreground/80',

  // Estado pendiente: badge + acción de respuesta.
  pendingBadge:
    'inline-flex w-fit items-center gap-1 rounded-full bg-brand-butter-soft px-2 py-0.5 text-xs font-medium text-brand-butter',
  actionsRow: 'flex items-center justify-end',

  // Formulario expandido al pulsar "Responder".
  form: 'flex flex-col gap-2 rounded-2xl border border-border/40 bg-card p-3',
  textarea:
    'min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  formMeta: 'flex items-center justify-between text-xs text-muted-foreground',
  charCounter: 'tabular-nums',
  error: 'text-xs text-destructive',
  formActions: 'flex items-center justify-end gap-2',
} as const;
