/**
 * Estilos del formulario de alta de servicio.
 *
 * El formulario está dividido en 2 bloques: clasificación (cascada de
 * categorías) y datos del servicio. Ambos se renderizan apilados en
 * móvil y en 2 columnas en desktop para aprovechar el ancho.
 */
export const addServiceFormStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  backLink:
    'inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground',

  card: 'flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 shadow-sm',
  cardTitle: 'font-display text-lg text-foreground',
  cardSubtitle: 'text-sm text-muted-foreground',

  fieldGrid: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-medium text-foreground',
  hint: 'text-xs text-muted-foreground',
  select:
    'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
  input:
    'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  textarea:
    'min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',

  actions: 'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
  notice:
    'rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground',
} as const;
