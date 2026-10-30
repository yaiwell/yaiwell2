/**
 * Estilos del selector de método de pago.
 *
 * Dos tarjetas seleccionables con radio nativo (accesible por teclado y
 * lector sin ARIA extra). La marcada se distingue por borde y fondo, no
 * solo por color del punto.
 */
export const paymentMethodPickerStyles = {
  root: 'flex flex-col gap-3',
  legend: 'mb-1 text-sm font-medium text-foreground',
  options: 'flex flex-col gap-2',
  option:
    'flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40',
  optionDisabled:
    'flex cursor-not-allowed items-start gap-3 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 opacity-80',
  radio: 'mt-1 size-4 shrink-0 accent-primary',
  optionBody: 'flex flex-col gap-0.5',
  optionTitle: 'text-sm font-medium text-foreground',
  optionHint: 'text-xs leading-relaxed text-muted-foreground',
} as const;
