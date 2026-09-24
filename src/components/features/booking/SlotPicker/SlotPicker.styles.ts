/**
 * Estilos del SlotPicker (calendario + cuadrícula de slots).
 *
 * Mobile-first. La tira de días superior scrollea horizontalmente para
 * aprovechar el ancho del móvil; la cuadrícula de slots usa un grid
 * de 2 columnas en móvil y hasta 4 en desktop.
 */
export const slotPickerStyles = {
  root: 'flex flex-col gap-5',

  // Tira de días: scroll horizontal con snap para que cada día encaje.
  dayStrip: '-mx-1 flex items-stretch gap-2 overflow-x-auto px-1 pb-1 snap-x scrollbar-thin',
  dayTabBase:
    'flex min-w-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-2 text-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 snap-start',
  dayTabIdle: 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/60',
  dayTabSelected: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
  dayTabWeekday: 'text-xs uppercase tracking-wide opacity-80',
  dayTabNumber: 'text-lg font-semibold',
  dayTabTodayDot: 'mt-0.5 size-1 rounded-full bg-current opacity-70',

  // Encabezado de sección (Mañana / Tarde).
  sectionTitle: 'text-xs font-medium uppercase tracking-wide text-muted-foreground mt-1 first:mt-0',
  sectionEmpty: 'text-sm text-muted-foreground',

  // Grid de slots.
  slotGrid: 'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4',
  slotButtonBase:
    'inline-flex h-11 items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  slotButtonIdle: 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60',
  slotButtonSelected: 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
  slotButtonDisabled:
    'border-dashed border-border bg-transparent text-muted-foreground line-through cursor-not-allowed',

  // Estado vacío cuando no hay ningún slot ni libre ni ocupado en el día.
  empty:
    'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center',
  emptyTitle: 'text-sm font-medium text-foreground',
  emptySubtitle: 'text-xs text-muted-foreground',

  // Estado de carga: reproduce la forma real de la rejilla (dos títulos
  // de sección + dos bloques de huecos) para que al llegar los datos no
  // haya salto de layout.
  skeletonSectionTitle: 'h-3 w-20 rounded-full bg-muted animate-pulse mt-1 first:mt-0',
  skeletonSlot: 'h-11 rounded-xl bg-muted animate-pulse',

  // Estado de error: la petición falló. Visualmente distinto del vacío
  // (borde sólido, no punteado) para que no se confundan de un vistazo.
  error:
    'flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center',
  errorTitle: 'text-sm font-medium text-foreground',
  errorSubtitle: 'text-xs text-muted-foreground',
} as const;
