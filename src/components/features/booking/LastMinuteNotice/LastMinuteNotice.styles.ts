import { cva } from 'class-variance-authority';

/**
 * Estilos del aviso de reserva de última hora.
 *
 * Tono neutro a propósito: es una condición de la reserva, no un peligro
 * ni un error, así que nada de rojo ni de ámbar de alerta. El mensaje no
 * depende del color: siempre va icono de rayo + texto.
 */
export const lastMinuteNotice = cva('flex items-start gap-2 text-foreground', {
  variants: {
    variant: {
      // Bloque de política en el resumen: sustituye a la de "cancela gratis".
      policy: 'rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed',
      // Frase corta encima del botón de pagar.
      compact: 'items-center justify-center text-sm font-medium',
    },
  },
  defaultVariants: { variant: 'policy' },
});

export const lastMinuteNoticeStyles = {
  icon: 'mt-0.5 size-4 shrink-0',
  iconCompact: 'size-4 shrink-0',
  text: 'flex-1',
} as const;
