/**
 * Estilos del listado de reservas accionables.
 *
 * Mismo lenguaje visual que `ServicesList`: tarjetas redondeadas sobre
 * fondo `card`, acciones alineadas a la derecha en desktop y apiladas
 * en móvil (mobile-first). El bloque de acciones se separa del cuerpo
 * con un borde suave para que "marcar finalizada" no compita con la
 * información de la cita.
 */
export const bookingActionsListStyles = {
  root: 'flex flex-col gap-4',
  header: 'flex flex-col gap-1',
  title: 'font-display text-foreground text-xl',
  subtitle: 'text-muted-foreground text-sm',

  // Aviso de modo preview: tono informativo, nunca alarmante.
  readOnlyNotice:
    'rounded-2xl border border-border bg-muted/50 px-3 py-2 text-muted-foreground text-sm',

  empty:
    'rounded-3xl border border-border border-dashed p-6 text-center text-muted-foreground text-sm',

  list: 'flex flex-col gap-3',
  card: 'flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between',
  cardMain: 'flex min-w-0 flex-col gap-1',
  cardWhen: 'flex flex-wrap items-center gap-2 text-foreground text-sm font-medium',
  cardWhenIcon: 'size-3.5 text-muted-foreground',
  cardService: 'text-foreground text-base',
  cardMeta: 'text-muted-foreground text-sm',

  cardAside: 'flex shrink-0 flex-col items-stretch gap-2 sm:items-end',
  cardPrice: 'text-foreground text-sm font-medium sm:text-right',
  cardActions: 'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',

  // Chips de estado. `refunded` comparte el tono de `cancelled` pero
  // con texto propio: el dinero ya ha vuelto al cliente.
  statusChip: 'rounded-full px-2 py-0.5 text-xs font-medium',
  statusPending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  statusConfirmed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  statusCompleted: 'bg-primary/15 text-primary',
  statusCancelled: 'bg-destructive/10 text-destructive',
  statusRefunded: 'bg-destructive/10 text-destructive',

  // Pista bajo el botón cuando la ventana de 2 h se ha cerrado.
  blockedHint: 'max-w-xs text-muted-foreground text-xs sm:text-right',
} as const;

/**
 * Estilos compartidos por los dos diálogos de confirmación
 * (finalizar y cancelar). Clonan el lenguaje del AlertDialog de
 * `ServiceDeleteButton` para que el panel se sienta de una pieza.
 */
export const bookingActionDialogStyles = {
  overlay:
    'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  content:
    'fixed left-1/2 top-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  title: 'font-display text-xl text-foreground',
  description: 'text-sm leading-relaxed text-muted-foreground',
  errorBanner:
    'rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
  actions: 'mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
} as const;
