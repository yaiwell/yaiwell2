/**
 * Estilos del componente SkipToContent.
 *
 * Patrón "visually hidden until focused": el enlace permanece fuera de
 * pantalla con position absolute + transform y solo aparece al recibir
 * foco por teclado (Tab desde la primera posición del documento).
 */
export const skipToContentStyles = {
  link: [
    'sr-only',
    'focus:not-sr-only',
    'focus:fixed',
    'focus:top-3',
    'focus:left-3',
    'focus:z-[100]',
    'focus:rounded-full',
    'focus:bg-foreground',
    'focus:px-4',
    'focus:py-2',
    'focus:text-sm',
    'focus:font-medium',
    'focus:text-background',
    'focus:shadow-lg',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-ring',
    'focus:ring-offset-2',
    'focus:ring-offset-background',
  ].join(' '),
} as const;
