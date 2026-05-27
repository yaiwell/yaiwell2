import type { BookingStatusClassMap } from './WeeklyCalendar.types';

/**
 * Estilos del calendario semanal del panel.
 *
 * La cuadrícula usa un grid de 8 columnas (1 columna de horas + 7 días).
 * En móvil el contenedor es scrolleable horizontalmente para no
 * comprimir las columnas hasta romperlas.
 */
export const weeklyCalendarStyles = {
  root: 'flex flex-col gap-4',
  header: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  summary: 'text-xs text-muted-foreground',

  scroll: 'overflow-x-auto rounded-3xl border border-border/60 bg-card shadow-sm',
  grid: 'grid min-w-[760px] grid-cols-[80px_repeat(7,minmax(0,1fr))]',

  headerRow: 'col-span-8 grid grid-cols-[80px_repeat(7,minmax(0,1fr))] border-b border-border/60',
  headerCell:
    'flex items-center justify-center px-2 py-3 text-xs font-medium text-muted-foreground',
  headerCellDay: 'border-l border-border/40',

  body: 'col-span-8 grid grid-cols-[80px_repeat(7,minmax(0,1fr))]',
  hourColumn: 'flex flex-col',
  hourCell:
    'flex h-[60px] items-start justify-end pr-2 pt-1 text-[11px] font-medium text-muted-foreground',

  dayColumn: 'relative border-l border-border/40',
  // El alto coincide con el cálculo: (END_HOUR - START_HOUR) * 60px.
  // 13 horas (08-21) * 60 = 780px.
  dayInner: 'relative h-[780px]',
  hourSeparator: 'absolute left-0 right-0 border-t border-dashed border-border/30',

  bookingBlock:
    'absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-[11px] leading-tight shadow-sm transition-all hover:z-10 hover:shadow-md',
  bookingTitle: 'truncate font-semibold',
  bookingMeta: 'truncate text-[10px] opacity-80',

  legend: 'flex flex-wrap items-center gap-3 text-xs text-muted-foreground',
  legendTitle: 'text-xs font-semibold text-foreground',
  legendChip: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
  legendDot: 'inline-block size-2 rounded-full',
} as const;

/**
 * Mapeo del estado de la reserva a las clases que se aplican al bloque
 * en la cuadrícula. Mantener aquí (no inline) facilita testear la
 * coherencia visual sin tocar el JSX.
 */
export const bookingBlockByStatus: BookingStatusClassMap = {
  confirmed: 'border-primary/30 bg-primary/10 text-foreground',
  pending: 'border-amber-300/60 bg-amber-100 text-amber-900',
  completed: 'border-emerald-300/60 bg-emerald-100 text-emerald-900',
  cancelled: 'border-rose-300/60 bg-rose-100 text-rose-900 line-through opacity-70',
} as const;

/**
 * Color del dot de la leyenda por estado. Coherente con
 * `bookingBlockByStatus` pero opaco para mejor legibilidad.
 */
export const legendDotByStatus: BookingStatusClassMap = {
  confirmed: 'bg-primary',
  pending: 'bg-amber-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
} as const;
