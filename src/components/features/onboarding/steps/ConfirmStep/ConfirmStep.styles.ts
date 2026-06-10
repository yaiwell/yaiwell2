/**
 * Estilos del paso 5 — resumen y CTA de publicación.
 */
export const confirmStepStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-2',
  title: 'font-display text-2xl leading-tight text-foreground sm:text-3xl',
  subtitle: 'text-sm text-muted-foreground',
  sections: 'flex flex-col gap-4',
  section: 'flex flex-col gap-2 rounded-2xl border border-border bg-card p-4',
  sectionHeading: 'text-sm font-semibold text-foreground',
  row: 'flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-4',
  rowLabel: 'text-xs uppercase tracking-wide text-muted-foreground',
  rowValue: 'text-sm font-medium text-foreground',
  termsRow: 'flex items-start gap-3',
  termsBox:
    'mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border border-border bg-background text-primary accent-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  termsLabel: 'text-sm leading-relaxed text-muted-foreground',
} as const;
