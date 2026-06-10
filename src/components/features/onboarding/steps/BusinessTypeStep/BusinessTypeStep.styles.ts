/**
 * Estilos del paso 1 — cards radio del tipo de negocio.
 *
 * Cards verticales (mobile-first) que en desktop se reparten en dos
 * columnas. Estado seleccionado con borde + fondo `primary/10` para
 * un acento sobrio coherente con el resto del wizard.
 */
export const businessTypeStepStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-2',
  title: 'font-display text-2xl leading-tight text-foreground sm:text-3xl',
  subtitle: 'text-sm text-muted-foreground',
  grid: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  card: 'group relative flex h-full cursor-pointer flex-col gap-2 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  cardSelected: 'border-primary bg-primary/10 ring-2 ring-primary/20',
  cardTitle: 'text-base font-semibold text-foreground',
  cardDescription: 'text-sm text-muted-foreground',
  radioDot:
    'absolute right-4 top-4 inline-flex size-4 items-center justify-center rounded-full border border-border bg-card',
  radioDotSelected: 'border-primary bg-primary',
  radioDotInner: 'size-2 rounded-full bg-primary-foreground',
} as const;
