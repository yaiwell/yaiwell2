/**
 * Estilos del diálogo de cancelación del cliente. Mismo lenguaje que el
 * AlertDialog de cancelar del panel del proveedor y que el diálogo de
 * valorar, para que el área cliente se sienta de una pieza.
 */
export const cancelBookingDialogStyles = {
  root: 'flex flex-col gap-1',
  trigger: 'text-destructive hover:bg-destructive/10 hover:text-destructive',
  triggerIcon: 'size-4',
  hint: 'text-xs text-muted-foreground',
  overlay:
    'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  content:
    'fixed left-1/2 top-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
  title: 'font-display text-xl text-foreground',
  description: 'text-sm leading-relaxed text-muted-foreground',
  money: 'rounded-2xl bg-muted/60 px-3 py-2 text-sm leading-relaxed text-foreground',
  errorBanner:
    'rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
  resultBanner:
    'rounded-2xl bg-status-now px-3 py-2 text-sm text-status-now-foreground ring-1 ring-inset ring-status-now-foreground/25',
  actions: 'mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
} as const;
