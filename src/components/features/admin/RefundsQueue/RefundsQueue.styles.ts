/**
 * Estilos de RefundsQueue.
 *
 * Mobile-first: cada reembolso es una tarjeta apilada. Desde `md` la
 * tarjeta reparte datos y acciones en dos columnas para que soporte
 * lea la cola de un vistazo en escritorio.
 */
export const refundsQueueStyles = {
  root: 'flex flex-col gap-4',
  sectionHeader: 'flex items-baseline justify-between gap-3',
  sectionTitle: 'font-display text-xl text-foreground',
  sectionCount: 'text-sm text-muted-foreground',
  notice: 'flex gap-3 rounded-2xl border border-border/60 bg-muted/50 p-4 text-sm text-foreground',
  noticeIcon: 'mt-0.5 size-4 shrink-0',
  noticeBody: 'flex flex-col gap-1.5',
  noticeTitle: 'font-medium',
  empty:
    'rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground',
  list: 'grid gap-3',
  card: 'grid gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border md:grid-cols-[1fr_auto] md:items-start md:gap-6 md:p-5',
  cardMain: 'flex min-w-0 flex-col gap-3',
  cardHeading: 'flex flex-col gap-0.5',
  provider: 'font-display text-base text-foreground',
  service: 'text-sm text-muted-foreground',
  details: 'grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2',
  detailItem: 'flex min-w-0 flex-col gap-0.5',
  detailLabel: 'text-xs uppercase tracking-wide text-muted-foreground',
  detailValue: 'break-words text-foreground',
  amount: 'font-medium tabular-nums text-foreground',
  reason:
    'break-words rounded-xl bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-foreground/80',
  cardActions: 'flex flex-col gap-2 sm:flex-row sm:items-center md:flex-col md:items-stretch',
  stripeLink:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  linkIcon: 'size-4',
  srOnly: 'sr-only',
  noPaymentIntent: 'text-xs text-muted-foreground',
} as const;
