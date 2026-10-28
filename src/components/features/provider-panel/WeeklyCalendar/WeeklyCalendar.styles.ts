import type { BookingStatusClassMap } from './WeeklyCalendar.types';

/**
 * Estilos del calendario semanal del panel.
 *
 * Desde `md` se ve la cuadrícula de 8 columnas (horas + 7 días); por
 * debajo, una pestaña por día con una sola columna a todo el ancho,
 * porque siete columnas no caben a 375 px sin volverse ilegibles.
 */
export const weeklyCalendarStyles = {
  root: 'flex flex-col gap-4',
  toolbar: 'flex flex-wrap items-center justify-between gap-3',
  summary: 'text-xs text-muted-foreground',

  // Navegación entre semanas.
  nav: 'flex items-center gap-1',
  navLabel: 'min-w-0 px-2 text-sm font-medium text-foreground tabular-nums',
  navIcon: 'size-4',

  // Cuadrícula de escritorio.
  desktop: 'hidden md:block',
  scroll: 'overflow-x-auto rounded-3xl border border-border/60 bg-card shadow-sm',
  grid: 'grid min-w-[760px] grid-cols-[64px_repeat(7,minmax(0,1fr))]',
  headerRow: 'col-span-8 grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border/60',
  headerCell:
    'flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium text-muted-foreground',
  headerCellDay: 'border-l border-border/40',
  headerDate: 'text-base font-semibold text-foreground tabular-nums',
  headerToday: 'text-primary',
  todayDot:
    'flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground',
  body: 'col-span-8 grid grid-cols-[64px_repeat(7,minmax(0,1fr))]',
  hourColumn: 'flex flex-col',
  hourCell:
    'flex h-[60px] items-start justify-end pr-2 pt-1 text-[11px] font-medium text-muted-foreground',
  dayColumn: 'relative border-l border-border/40',
  dayColumnToday: 'bg-primary/[0.03]',

  // Columna de un día (compartida por escritorio y móvil). El alto se
  // calcula en línea: horas visibles × 60 px.
  dayInner: 'relative',
  hourSeparator: 'absolute left-0 right-0 border-t border-dashed border-border/30',

  // Vista de día en móvil.
  mobile: 'flex flex-col gap-3 md:hidden',
  tabList: 'grid grid-cols-7 gap-1',
  tab: 'flex flex-col items-center gap-0.5 rounded-2xl border border-transparent px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
  tabSelected: 'border-border bg-card text-foreground shadow-sm',
  tabDate: 'text-base font-semibold tabular-nums',
  tabToday: 'text-primary',
  tabCount: 'h-1.5 w-1.5 rounded-full bg-primary',
  tabCountEmpty: 'h-1.5 w-1.5',
  srOnly: 'sr-only',
  dayPanel:
    'grid grid-cols-[52px_minmax(0,1fr)] overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm',
  dayEmpty:
    'rounded-3xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground',

  // Bloque de reserva: es un botón que abre el detalle.
  bookingBlock:
    'absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition-shadow outline-none hover:z-10 hover:shadow-md focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
  bookingTitle: 'block truncate font-semibold',
  bookingMeta: 'block truncate text-[10px] opacity-80',

  // Hueco liberado con descuento: borde discontinuo para que nunca se
  // confunda con una reserva. Por encima de los bloques de reserva.
  offerBlock:
    'absolute z-[1] overflow-hidden rounded-lg border border-dashed border-primary/60 bg-card/95 px-2 py-1 text-left text-[11px] leading-tight text-primary shadow-sm transition-shadow outline-none hover:z-10 hover:shadow-md focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer',
  offerBlockFull: 'inset-x-1',
  offerBlockCompact: 'left-1/2 right-1',

  legend: 'flex flex-wrap items-center gap-3 text-xs text-muted-foreground',
  legendDotOffer: 'inline-block size-2 rounded-full border border-dashed border-primary',
  legendTitle: 'text-xs font-semibold text-foreground',
  legendChip: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
  legendDot: 'inline-block size-2 rounded-full',
} as const;

/** Detalle de una reserva (diálogo que abre el bloque). */
export const bookingDetailStyles = {
  header: 'flex items-start justify-between gap-3',
  close:
    'rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
  closeIcon: 'size-4',
  srOnly: 'sr-only',
  list: 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm',
  term: 'text-muted-foreground',
  value: 'text-foreground',
  actions:
    'flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end',
  noActions: 'border-t border-border/60 pt-4 text-sm text-muted-foreground',
  originalPrice: 'ml-1 text-muted-foreground line-through',
  tierList: 'flex flex-col gap-0.5',
  hint: 'text-xs text-muted-foreground sm:self-center',
} as const;

/**
 * Mapeo del estado de la reserva a las clases que se aplican al bloque
 * en la cuadrícula. Mantener aquí (no inline) facilita testear la
 * coherencia visual sin tocar el JSX.
 */
export const bookingBlockByStatus: BookingStatusClassMap = {
  confirmed: 'border-primary/30 bg-primary/10 text-foreground',
  pending: 'border-status-soon-foreground/30 bg-status-soon text-status-soon-foreground',
  completed: 'border-status-now-foreground/30 bg-status-now text-status-now-foreground',
  cancelled: 'border-destructive/30 bg-destructive/15 text-destructive line-through opacity-70',
} as const;

/**
 * Color del dot de la leyenda por estado. Coherente con
 * `bookingBlockByStatus` pero opaco para mejor legibilidad.
 */
export const legendDotByStatus: BookingStatusClassMap = {
  confirmed: 'bg-primary',
  pending: 'bg-brand-butter',
  completed: 'bg-brand-sage',
  cancelled: 'bg-destructive',
} as const;
