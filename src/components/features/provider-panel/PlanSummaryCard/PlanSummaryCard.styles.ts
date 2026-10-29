/**
 * Estilos de la tarjeta resumen del plan. Mismo lenguaje visual que
 * `StripeConnectCard` (bloques de `/panel/centro`).
 */
export const planSummaryCardStyles = {
  card: 'flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6',
  header: 'flex flex-col gap-1',
  eyebrow: 'text-xs font-medium uppercase tracking-wider text-muted-foreground',
  title: 'font-display text-2xl text-foreground',
  list: 'grid gap-3 sm:grid-cols-3',
  item: 'flex flex-col gap-0.5 rounded-2xl bg-muted/40 px-4 py-3',
  term: 'text-xs text-muted-foreground',
  value: 'text-sm font-medium text-foreground',
  note: 'text-sm text-muted-foreground',
  actions: 'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
} as const;
