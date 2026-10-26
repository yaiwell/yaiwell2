/**
 * Estilos del botón de reintento de reembolso.
 */
export const retryRefundButtonStyles = {
  button:
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
  icon: 'size-4',
  iconSpinning: 'size-4 animate-spin',
} as const;
