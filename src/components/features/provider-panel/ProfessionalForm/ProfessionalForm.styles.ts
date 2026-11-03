/**
 * Estilos del formulario de profesional y su diálogo de baja. Mismo
 * lenguaje de tarjetas que `ProviderSettings` y `AddServiceForm`.
 */
export const professionalFormStyles = {
  root: 'flex flex-col gap-6',
  backLink:
    'inline-flex w-fit items-center gap-1 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground',
  header: 'flex flex-col gap-1',
  title: 'font-display text-2xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',

  // `contents`: el fieldset solo agrupa para deshabilitar, no maqueta.
  fieldset: 'contents',

  card: 'flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 shadow-sm',
  cardTitle: 'font-display text-lg text-foreground',
  cardSubtitle: 'text-sm text-muted-foreground',

  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-medium text-foreground',
  hint: 'text-xs text-muted-foreground',
  input:
    'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:bg-muted',
  textarea:
    'min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:bg-muted',

  servicesList: 'flex flex-col gap-2',
  serviceOption:
    'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm text-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/5',
  checkbox: 'size-4 accent-primary',

  infoNotice: 'rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground',
  successNotice:
    'rounded-2xl border border-status-now/40 bg-status-now/10 p-3 text-sm text-foreground',
  errorNotice:
    'flex flex-col gap-1 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive',
  errorList: 'list-disc pl-5',

  actions: 'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between',
  primaryActions: 'flex flex-col gap-2 sm:flex-row sm:justify-end',

  // Diálogo de baja (mismo patrón que el de borrar servicio).
  overlay:
    'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  dialog:
    'fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl outline-none',
  dialogTitle: 'font-display text-xl text-foreground',
  dialogText: 'text-sm leading-relaxed text-muted-foreground',
  bookingsBlock: 'flex flex-col gap-2',
  bookingList: 'flex flex-col gap-1 rounded-2xl bg-muted/40 p-3 text-sm text-foreground',
  dialogLink:
    'inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline',
  dialogActions: 'mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
  destructiveTrigger:
    'text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/30',
} as const;
