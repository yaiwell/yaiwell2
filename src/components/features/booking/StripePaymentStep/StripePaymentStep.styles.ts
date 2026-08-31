/**
 * Estilos del paso de pago real.
 *
 * El formulario de tarjeta lo pinta Stripe dentro de un iframe, así que
 * aquí sólo vestimos lo que rodea al `PaymentElement`: importe, CTA,
 * mensajes de error y el sello de seguridad. Reutilizamos las mismas
 * medidas que tenía el paso mock para que el cambio no altere el ritmo
 * visual del flujo.
 */
export const stripePaymentStepStyles = {
  root: 'flex flex-col gap-5',

  // Línea de importe total, idéntica a la del resumen para dar continuidad.
  amountRow:
    'flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3',
  amountLabel: 'text-sm font-medium text-foreground',
  amountValue: 'text-lg font-semibold text-foreground',

  // Contenedor del PaymentElement de Stripe.
  elementWrapper: 'rounded-2xl border border-border bg-card p-4',

  // CTA de pago. Misma silueta que el resto de CTAs primarios del flujo.
  payButton:
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100',
  payButtonSpinner: 'size-4 animate-spin rounded-full border-2 border-current border-r-transparent',

  // Mensaje de error devuelto por Stripe (tarjeta rechazada, 3DS fallido…).
  errorBox:
    'rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive',

  // Sello de seguridad bajo el CTA.
  secureNote: 'flex items-center justify-center gap-2 text-xs text-muted-foreground',
  secureIcon: 'size-3.5',

  // Estados de carga y error mientras se abre el checkout.
  statusBox:
    'flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-10 text-center',
  statusSpinner:
    'size-6 animate-spin rounded-full border-2 border-muted-foreground/40 border-r-transparent',
  statusText: 'text-sm text-muted-foreground',
  statusTitle: 'text-base font-medium text-foreground',
  retryButton:
    'inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
} as const;
