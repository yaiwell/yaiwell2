import { cva } from 'class-variance-authority';

/**
 * Estilos del importe con descuento.
 *
 * El precio de referencia va tachado y en tono apagado, y la marca del
 * % es discreta (sin rojo ni contadores): se informa, no se presiona.
 */
export const discountedPriceStyles = {
  root: 'inline-flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5',
  original: 'text-xs text-muted-foreground line-through decoration-1',
  badge:
    'inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary',
} as const;

/** Importe final: el tamaño depende de dónde se pinta. */
export const discountedPriceAmount = cva('font-semibold text-foreground', {
  variants: {
    size: {
      md: 'text-sm',
      lg: 'text-lg',
    },
  },
  defaultVariants: { size: 'md' },
});
