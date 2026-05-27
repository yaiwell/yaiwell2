/**
 * Estilos del paso de pago mock.
 *
 * Componemos un "card de pago" minimalista que sugiere visualmente un
 * formulario de tarjeta sin pedir datos reales. La ausencia de campos
 * editables refuerza al usuario que se trata de una demo.
 */
export const mockPaymentStepStyles = {
  root: 'flex flex-col gap-5',

  // Tarjeta superior con apariencia de "tarjeta bancaria".
  fakeCard:
    'flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 p-6 text-background shadow-md',
  fakeCardLabel: 'text-[10px] font-medium uppercase tracking-[0.2em] opacity-70',
  fakeCardNumber: 'font-mono text-lg tracking-widest',
  fakeCardRow: 'flex items-end justify-between gap-4',
  fakeCardSmall: 'text-xs opacity-80',

  // Línea de importe total.
  amountRow:
    'flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3',
  amountLabel: 'text-sm font-medium text-foreground',
  amountValue: 'text-lg font-semibold text-foreground',

  // CTA pagar.
  // CTA principal del flujo de pago. `active:scale` da feedback de tap;
  // se desactiva con `disabled:` para no confundir cuando carga.
  payButton:
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100',
  payButtonSpinner: 'size-4 animate-spin rounded-full border-2 border-current border-r-transparent',

  // Nota explicativa de que es un mock.
  mockNote:
    'rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground',
} as const;
