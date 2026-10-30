/**
 * Estilos del panel «Pagar en el local».
 *
 * Mismo ritmo que el paso de pago online (línea de importe, condiciones
 * y CTA a todo el ancho) para que cambiar de método no cambie la página.
 * El aviso de no presentado es una condición, no un error: tono neutro.
 */
export const onsiteConfirmPanelStyles = {
  root: 'flex flex-col gap-5',
  amountRow:
    'flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3',
  amountLabel: 'text-sm font-medium text-foreground',
  noShowNotice:
    'flex items-start gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground',
  noShowIcon: 'mt-0.5 size-4 shrink-0 text-muted-foreground',
  confirmButton:
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100',
  spinner: 'size-4 animate-spin rounded-full border-2 border-current border-r-transparent',
  payAtVenueNote: 'text-center text-xs text-muted-foreground',
} as const;
