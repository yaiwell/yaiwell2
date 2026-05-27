/**
 * Estilos del bloque de métricas del dashboard del proveedor.
 *
 * Layout responsive:
 *  - Móvil: 1 columna apilada.
 *  - Tablet: 2 columnas para los KPIs.
 *  - Desktop: 4 columnas para los KPIs y 2 columnas para la fila de
 *    gráfica + top servicios.
 */
export const dashboardMetricsStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',

  kpiGrid: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
  kpiCard:
    'flex flex-col gap-2 rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
  kpiLabel: 'text-sm text-muted-foreground',
  kpiValue: 'font-display text-2xl text-foreground',
  kpiDeltaPositive:
    'inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700',
  kpiDeltaNegative:
    'inline-flex w-fit items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700',
  kpiDeltaHint: 'text-[11px] text-muted-foreground',

  splitGrid: 'grid grid-cols-1 gap-4 lg:grid-cols-2',

  chartCard: 'flex flex-col gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm',
  chartHeader: 'flex flex-col gap-1',
  chartTitle: 'font-display text-lg text-foreground',
  chartSubtitle: 'text-xs text-muted-foreground',
  chartBars: 'flex h-44 items-end gap-3 pt-2',
  chartBarColumn: 'flex h-full flex-1 flex-col items-center justify-end gap-2',
  chartBar:
    'w-full rounded-t-xl bg-gradient-to-t from-primary/60 to-primary transition-all hover:from-primary/80 hover:to-primary',
  chartBarLabel: 'text-[11px] font-medium text-muted-foreground',

  topCard: 'flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm',
  topTitle: 'font-display text-lg text-foreground',
  topSubtitle: 'text-xs text-muted-foreground',
  topList: 'flex flex-col gap-2 pt-2',
  topItem:
    'flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background px-3 py-2',
  topItemInfo: 'flex flex-col',
  topItemName: 'text-sm font-medium text-foreground',
  topItemMeta: 'text-xs text-muted-foreground',
  topItemValue: 'text-sm font-semibold text-foreground',
} as const;
