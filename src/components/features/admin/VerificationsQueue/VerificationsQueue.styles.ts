/**
 * Estilos de VerificationsQueue.
 *
 * Tabla densa pensada para escritorio (los moderadores trabajan en
 * desktop). En móvil cada solicitud se convierte en una card apilada
 * para no romper la lectura.
 */
export const verificationsQueueStyles = {
  root: 'flex flex-col gap-4',
  sectionHeader: 'flex items-baseline justify-between gap-3',
  sectionTitle: 'font-display text-xl text-foreground',
  sectionCount: 'text-sm text-muted-foreground',
  empty:
    'rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground',
  list: 'grid gap-3',
  row: 'group grid gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border md:grid-cols-[1fr_auto_auto_auto] md:items-center md:gap-6 md:p-5',
  rowMain: 'flex flex-col gap-1',
  name: 'font-display text-base text-foreground',
  meta: 'text-xs text-muted-foreground',
  typePill:
    'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80 ring-1 ring-inset ring-border',
  submittedAt: 'text-sm text-muted-foreground',
  cta: 'inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
} as const;
