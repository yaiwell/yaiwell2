/**
 * Estilos del listado del equipo (`/panel/equipo`). Mismo lenguaje de
 * tarjetas que el listado de servicios.
 */
export const teamListStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
  headerText: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  counter: 'text-xs font-medium text-muted-foreground',
  addCta:
    'inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',

  notice:
    'flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
  noticeLink:
    'inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline',
  warning:
    'flex flex-col gap-1 rounded-2xl border border-status-soon/40 bg-status-soon/10 p-3 text-sm text-foreground',
  warningTitle: 'font-medium',
  warningList: 'list-disc pl-5 text-muted-foreground',

  list: 'flex flex-col gap-3',
  empty:
    'rounded-3xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground',

  card: 'flex items-center gap-4 rounded-3xl border border-border/60 bg-card p-4 shadow-sm',
  cardInactive: 'opacity-70',
  cardMain: 'flex min-w-0 flex-1 flex-col gap-1',
  cardName: 'truncate font-display text-base text-foreground',
  cardMeta: 'flex flex-wrap items-center gap-2 text-xs text-muted-foreground',
  badge: 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  badgeActive: 'bg-status-now text-status-now-foreground',
  badgeOutOfPlan: 'bg-status-soon text-status-soon-foreground',
  badgeInactive: 'bg-muted text-foreground/70',
  editLink:
    'inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const;
