/**
 * Estilos del calendario de días de `/buscar`.
 */
export const searchDayPickerStyles = {
  root: 'flex flex-col gap-2',
  hint: 'text-xs text-muted-foreground',
  grid: 'grid grid-cols-7 gap-1',
  weekday: 'py-1 text-center text-xs font-medium uppercase text-muted-foreground',
  // Celdas de al menos 40 px de alto: objetivo táctil cómodo en un móvil de 375.
  day: 'flex h-10 flex-col items-center justify-center rounded-xl border text-sm leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed',
  dayIdle:
    'border-transparent text-foreground hover:bg-muted disabled:text-muted-foreground/50 disabled:hover:bg-transparent',
  daySelected: 'border-primary bg-primary font-medium text-primary-foreground',
  month: 'mb-0.5 text-[10px] font-medium uppercase leading-none tracking-wide opacity-80',
  empty: 'h-10',
} as const;
