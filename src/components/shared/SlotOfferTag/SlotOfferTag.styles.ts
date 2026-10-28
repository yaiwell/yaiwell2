import { cva } from 'class-variance-authority';

/**
 * Estilos de la etiqueta de hueco liberado.
 *
 * Tono de marca y tamaño de chip, sin rojo ni parpadeos: es una
 * oportunidad que se anuncia, no una alarma.
 */
export const slotOfferTag = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
  {
    variants: {
      variant: {
        // Sobre foto: fondo casi opaco para asegurar contraste con cualquier imagen.
        overlay: 'bg-card/95 px-2.5 py-1 text-foreground shadow-sm backdrop-blur hover:bg-card',
        inline:
          'border border-primary/25 bg-primary/10 px-3 py-1.5 text-primary hover:bg-primary/15',
      },
    },
    defaultVariants: { variant: 'inline' },
  },
);

export const slotOfferTagStyles = {
  icon: 'size-3.5 shrink-0 text-primary',
  text: 'truncate',
} as const;
