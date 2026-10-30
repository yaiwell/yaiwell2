/**
 * Estilos de la tarjeta «Cobro en el local». Mismo lenguaje que
 * `PlanSummaryCard` (bloques de `/panel/plan`).
 */
export const onsitePaymentCardStyles = {
  card: 'flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6',
  header: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  description: 'text-sm leading-relaxed text-muted-foreground',

  toggleRow: 'flex items-center justify-between gap-4 rounded-2xl bg-muted/40 px-4 py-3',
  toggleText: 'flex flex-col gap-0.5',
  toggleLabel: 'text-sm font-medium text-foreground',
  status: 'text-xs text-muted-foreground',
  statusSuspended: 'text-xs font-medium text-destructive',

  // Interruptor accesible (role="switch"): pista y pulgar.
  switchTrack:
    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted transition-colors aria-checked:border-primary aria-checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
  switchThumb:
    'pointer-events-none inline-block size-5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform',
  switchThumbOn: 'translate-x-5',

  methodRow: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  methodText: 'text-sm text-foreground',
  debt: 'rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-relaxed text-destructive',
  amounts: 'flex flex-col gap-1 text-sm text-muted-foreground',
  error:
    'rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
} as const;
