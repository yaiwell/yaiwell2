/**
 * Estilos del diálogo de liberar hueco con descuento.
 *
 * Reutiliza el lenguaje de los diálogos del panel
 * (`bookingActionDialogStyles`) y añade los tramos con su selector.
 */
export const releaseSlotStyles = {
  header: 'flex flex-col gap-1',
  subtitle: 'text-sm font-medium text-foreground',
  rules: 'text-xs leading-relaxed text-muted-foreground',

  // Aviso informativo (reembolso pendiente): sin tono alarmista.
  notice: 'rounded-2xl border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground',

  tiers: 'flex flex-col gap-2',
  tierRow:
    'flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background px-3 py-2',
  tierRowCurrent: 'border-primary/40 bg-primary/5',
  tierLabel: 'flex min-w-0 flex-col gap-0.5 text-sm text-foreground',
  tierNow: 'w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary',

  stepper: 'flex shrink-0 items-center gap-1',
  // 40 px en móvil (objetivo táctil cómodo); 32 px desde md.
  stepperButton: 'size-10 rounded-full md:size-8',
  stepperIcon: 'size-3.5',
  stepperValue: 'w-12 text-center text-sm font-semibold tabular-nums text-foreground',

  issue: 'text-xs text-destructive',

  success: 'flex flex-col gap-2',
  successIcon: 'size-6 text-primary',

  trigger: 'shrink-0',
} as const;
