import { cva } from 'class-variance-authority';

/**
 * Estilos de StripeConnectCard.
 *
 * Mismo lenguaje visual que los demás bloques de `/panel/centro`. Los
 * colores de estado usan los tokens `--status-*` de `globals.css`, que
 * están calibrados para contraste AA en claro y oscuro.
 */
export const stripeConnectCardStyles = {
  card: 'flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-6',
  cardTitle: 'font-display text-xl text-foreground',
  cardSubtitle: 'text-sm text-muted-foreground',
  statusRow: 'flex flex-wrap items-center gap-2',
  businessTypeLine: 'text-sm text-muted-foreground',
  description: 'text-sm leading-relaxed text-foreground/85',
  hint: 'text-sm leading-relaxed text-muted-foreground',
  actions: 'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
  primaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors duration-150 hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  secondaryCta:
    'inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  noticeOk:
    'rounded-2xl border border-status-now-foreground/30 bg-status-now px-4 py-3 text-sm text-status-now-foreground',
  noticeInfo:
    'rounded-2xl border border-status-info-foreground/30 bg-status-info px-4 py-3 text-sm text-status-info-foreground',
  noticeError:
    'rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive',
} as const;

/** Badge de estado con variante por tono semántico. */
export const stripeStatusBadge = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
  {
    variants: {
      tone: {
        now: 'bg-status-now text-status-now-foreground',
        soon: 'bg-status-soon text-status-soon-foreground',
        busy: 'bg-status-busy text-status-busy-foreground',
        info: 'bg-status-info text-status-info-foreground',
      },
    },
    defaultVariants: { tone: 'busy' },
  },
);
