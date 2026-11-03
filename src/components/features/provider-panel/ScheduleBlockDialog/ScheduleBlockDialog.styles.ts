/**
 * Estilos del diálogo «Bloquear horas».
 *
 * Reutiliza el lenguaje de los diálogos del panel
 * (`bookingActionDialogStyles`) y los campos del alta de servicio.
 * Mobile-first: fecha y hora van en dos columnas también a 375 px (los
 * controles nativos caben) y el diálogo hace scroll si el teclado lo
 * tapa.
 */
export const scheduleBlockDialogStyles = {
  trigger: 'shrink-0',
  triggerIcon: 'size-4',

  // El contenido base del panel no tiene alto máximo: con el teclado
  // abierto y la lista de conflictos podría salirse de la pantalla.
  content: 'max-h-[calc(100dvh-2rem)] overflow-y-auto',

  form: 'flex flex-col gap-4',
  header: 'flex flex-col gap-1',

  fieldset: 'flex flex-col gap-2',
  legend: 'mb-1 text-sm font-medium text-foreground',
  row: 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2',
  field: 'flex flex-col gap-1.5',
  label: 'text-xs text-muted-foreground',
  input:
    'h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground tabular-nums transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 md:h-10',
  textarea:
    'min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
  reasonMeta: 'flex items-start justify-between gap-3',
  hint: 'text-xs text-muted-foreground',
  counter: 'shrink-0 text-xs text-muted-foreground tabular-nums',

  issue: 'text-xs text-destructive',

  conflicts: 'flex flex-col gap-2',
  conflictList: 'flex flex-col gap-1 pl-4 text-sm text-destructive list-disc',
  conflictHint: 'text-xs text-destructive/90',

  success: 'flex flex-col gap-2',
  successIcon: 'size-6 text-primary',
} as const;
