import { cva } from 'class-variance-authority';

/**
 * Estilos del reembolso por incidencia del centro.
 *
 * El botón final va en color destructivo: mueve dinero y cancela una
 * reserva, y no se puede deshacer.
 */
export const incidentRefundPanelStyles = {
  root: 'flex flex-col gap-4 border-t border-border/60 pt-8',
  header: 'flex flex-col gap-1',
  title: 'font-display text-xl text-foreground',
  intro: 'max-w-2xl text-sm text-muted-foreground',
  lookup: 'flex flex-col gap-2 sm:flex-row sm:items-end',
  field: 'flex min-w-0 flex-1 flex-col gap-1.5',
  label: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  input:
    'w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  search:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
  card: 'flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 md:p-5',
  details: 'grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2',
  detailItem: 'flex min-w-0 flex-col gap-0.5',
  detailLabel: 'text-xs uppercase tracking-wide text-muted-foreground',
  detailValue: 'break-words text-foreground',
  ineligible: 'rounded-xl bg-muted/60 p-3 text-sm text-foreground',
  form: 'flex flex-col gap-2',
  warning: 'text-sm text-muted-foreground',
  textarea:
    'min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive',
  hint: 'text-xs text-muted-foreground',
  noteError: 'text-xs text-destructive',
  confirm:
    'inline-flex items-center justify-center gap-1.5 self-start rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  spinner: 'size-4 animate-spin',
  unfinishedRoot: 'flex flex-col gap-3',
  unfinishedList: 'grid gap-3',
  unfinishedCard:
    'flex flex-col gap-3 rounded-2xl border border-amber-600/30 bg-card p-4 md:flex-row md:items-start md:justify-between md:gap-6 md:p-5',
  unfinishedMain: 'flex min-w-0 flex-col gap-3',
  unfinishedProvider: 'font-display text-base text-foreground',
  unfinishedService: 'text-sm text-muted-foreground',
  complete:
    'inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  reset:
    'self-start rounded-full px-2 py-1 text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const;

/** Banda de resultado con variantes por tono del desenlace. */
export const incidentRefundMessage = cva('rounded-2xl border px-4 py-3 text-sm', {
  variants: {
    tone: {
      success: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200',
      warning: 'border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
      error: 'border-destructive/30 bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { tone: 'success' },
});
