/**
 * Estilos del paso de confirmación final del flujo de reserva.
 *
 * Layout limpio centrado: tick verde grande arriba, datos clave en el
 * medio y dos CTAs (volver al centro y a la home/búsqueda) abajo.
 */
export const bookingConfirmationStyles = {
  root: 'flex flex-col items-center gap-6 text-center',

  // Tick verde dentro de un círculo grande.
  // Usa el token de marca `brand-sage` para mantener coherencia cromática
  // en claro y oscuro (los soft están definidos en globals.css por modo).
  iconCircle:
    'flex size-16 items-center justify-center rounded-full bg-brand-sage-soft text-brand-sage',
  icon: 'size-9',

  // Bloque de título + subtítulo.
  titleBlock: 'flex flex-col gap-2',
  title: 'font-display text-2xl text-foreground md:text-3xl',
  subtitle: 'text-sm text-muted-foreground',

  // Resumen condensado en formato lista vertical.
  detailsCard:
    'flex w-full flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4 text-left',
  row: 'flex items-start justify-between gap-4',
  rowLabel: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  rowValue: 'text-sm text-foreground text-right',
  rowValueMono: 'font-mono text-xs text-foreground text-right',

  // Botones de acción finales.
  actions: 'flex w-full flex-col gap-2 sm:flex-row sm:justify-center',
  primaryAction:
    'inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
  secondaryAction:
    'inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
} as const;
