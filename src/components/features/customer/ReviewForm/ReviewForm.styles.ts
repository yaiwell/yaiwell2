/**
 * Estilos del formulario de valoración y de su diálogo.
 *
 * El diálogo sigue el patrón sheet de `ServiceDetailSheet`: bottom-sheet
 * en móvil (pulgar cerca de los botones) y panel centrado desde `sm`.
 */
export const reviewFormStyles = {
  overlay:
    'fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  content:
    'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(32rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95',
  header: 'flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5',
  titleBlock: 'flex flex-col gap-1',
  title: 'font-display text-xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  closeButton:
    'flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',

  form: 'flex flex-col gap-5 overflow-y-auto px-6 py-5',

  // Selector de estrellas: cada etiqueta envuelve un radio oculto
  // (`sr-only`) y pinta el anillo de foco cuando el radio lo tiene.
  fieldset: 'flex flex-col gap-2',
  legend: 'mb-2 text-sm font-medium text-foreground',
  stars: 'flex items-center gap-1',
  starLabel:
    'flex size-11 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50 has-[:disabled]:cursor-not-allowed',
  starInput: 'sr-only',
  starIcon: 'size-7 transition-colors',
  // Mismo ocre que `RatingSummary` (≥ 3:1 sobre card en ambos modos).
  starFilled: 'fill-status-soon-foreground stroke-status-soon-foreground',
  starEmpty: 'fill-transparent stroke-muted-foreground',
  ratingCaption: 'min-h-5 text-sm text-muted-foreground',

  textField: 'flex flex-col gap-2',
  textLabel: 'text-sm font-medium text-foreground',
  textarea:
    'min-h-32 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60',
  textMeta: 'flex items-start justify-between gap-3 text-xs text-muted-foreground',
  counterOver: 'text-destructive',

  fieldError: 'text-sm text-destructive',
  serverError:
    'rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
  success:
    'rounded-2xl bg-status-now px-4 py-3 text-sm text-status-now-foreground ring-1 ring-inset ring-status-now-foreground/25',

  actions: 'flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end',
} as const;
