/**
 * Estilos de StripeConnectCard.
 *
 * Mismo lenguaje visual que los demás cards de `/panel/centro`: card
 * con borde sutil + título grande + subtítulo + bloque de estado +
 * CTA al pie. El badge usa color semántico según estado:
 *  - Habilitado: verde sage (mismo `bg-brand-sage` que approve admin).
 *  - Pendiente: ámbar.
 *  - Desconectado: neutro (muted).
 */
export const stripeConnectCardStyles = {
  card: 'flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6',
  cardTitle: 'font-display text-xl text-foreground',
  cardSubtitle: 'text-sm text-muted-foreground',
  statusRow: 'flex flex-wrap items-center gap-2',
  badge: 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
  badgeOk: 'bg-brand-sage text-[oklch(0.22_0.025_350)]',
  badgePending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  badgeOff: 'bg-muted text-muted-foreground',
  description: 'text-sm leading-relaxed text-foreground/85',
  actions: 'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
  primaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors duration-150 hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  secondaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  noticeOk:
    'rounded-2xl border border-brand-sage/40 bg-brand-sage/10 px-4 py-3 text-sm text-foreground',
  noticeError:
    'rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive',
} as const;
