/**
 * Estilos del descarte de una entrada de la cola de reembolsos.
 *
 * El botón es secundario a propósito (borde, sin relleno): descartar es
 * la salida excepcional; reintentar sigue siendo la acción principal.
 */
export const dismissRefundFormStyles = {
  trigger:
    'inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  icon: 'size-4',
  form: 'flex w-full flex-col gap-2 rounded-2xl border border-border/60 bg-muted/40 p-3 md:w-72',
  label: 'text-xs font-medium uppercase tracking-wide text-muted-foreground',
  textarea:
    'min-h-20 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive',
  hint: 'text-xs text-muted-foreground',
  error: 'text-xs text-destructive',
  actions: 'flex flex-wrap gap-2',
  confirm:
    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  cancel:
    'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
  spinner: 'size-4 animate-spin',
} as const;
