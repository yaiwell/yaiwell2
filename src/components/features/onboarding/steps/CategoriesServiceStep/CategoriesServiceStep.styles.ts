/**
 * Estilos del paso 4 — categoría raíz + primer servicio.
 */
export const categoriesServiceStepStyles = {
  root: 'flex flex-col gap-8',
  header: 'flex flex-col gap-2',
  title: 'font-display text-2xl leading-tight text-foreground sm:text-3xl',
  subtitle: 'text-sm text-muted-foreground',
  block: 'flex flex-col gap-4',
  label: 'text-sm font-medium text-foreground',
  helper: 'text-xs text-muted-foreground',
  // Grid de categorías raíz como pills clickables.
  categoryGrid: 'grid grid-cols-2 gap-2 sm:grid-cols-3',
  categoryCard:
    'group flex h-full cursor-pointer flex-col items-start gap-1.5 rounded-2xl border border-border bg-card p-3 text-left text-sm font-medium text-foreground transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  categoryCardSelected: 'border-primary bg-primary/10 ring-2 ring-primary/20',
  categoryEmoji: 'text-lg',
  serviceBlock: 'flex flex-col gap-4 rounded-2xl border border-border bg-card p-5',
  serviceBlockHeading: 'text-base font-semibold text-foreground',
  field: 'flex flex-col gap-1.5',
  input:
    'h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  textarea:
    'min-h-[80px] w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  twoCols: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  durationChips: 'flex flex-wrap gap-2',
  durationChip:
    'inline-flex h-9 items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted',
  durationChipSelected: 'border-primary bg-primary/15 text-primary',
} as const;
