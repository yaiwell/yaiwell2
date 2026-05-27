/**
 * Estilos de AdminMetricsGrid.
 *
 * Grid de cards KPI. Cada card es deliberadamente sobria: número
 * grande arriba, label debajo y delta semanal en una pill al pie.
 * El panel admin huye de cualquier exceso visual del lado público.
 */
export const adminMetricsGridStyles = {
  grid: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
  card: 'flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-5 shadow-sm',
  label: 'text-xs uppercase tracking-wider text-muted-foreground',
  value: 'font-display text-3xl leading-none text-foreground',
  deltaWrap: 'mt-2 inline-flex items-center gap-1 self-start text-xs font-medium',
  deltaPositive:
    'rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  deltaNegative: 'rounded-full bg-rose-50 px-2 py-1 text-rose-700 ring-1 ring-inset ring-rose-200',
} as const;
