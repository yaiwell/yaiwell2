import { cva } from 'class-variance-authority';

/**
 * Estilos de PhotoPlaceholder.
 *
 * Decisión de diseño: un centro sin fotos no debe verse "roto". En vez
 * de dejar el hueco vacío pintamos un degradado suave entre dos tokens
 * cálidos (`muted` → `secondary`) con un icono dentro de una pastilla
 * circular. El resultado se lee como una ilustración intencionada y no
 * como una imagen que no cargó.
 *
 * Todo se apoya en tokens semánticos (`bg-muted`, `bg-secondary`,
 * `bg-background`, `text-muted-foreground`, `border`) para que el par
 * claro/oscuro funcione sin escribir una sola variante `dark:`.
 *
 * `absolute inset-0` porque todos los consumidores ya tienen un
 * contenedor `relative` con dimensiones fijas (aspect-ratio), igual que
 * el `next/image` con `fill` al que sustituye.
 */
export const photoPlaceholderRoot = cva(
  'absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted to-secondary text-muted-foreground select-none',
  {
    variants: {
      size: {
        sm: 'gap-1.5',
        md: 'gap-2',
        lg: 'gap-3',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Pastilla circular que contiene el icono. El `bg-background` la separa
 * del degradado y el `ring` la remata; sin ella el icono flota y parece
 * un error de carga.
 */
export const photoPlaceholderIconWrapper = cva(
  'flex items-center justify-center rounded-full bg-background/70 shadow-sm ring-1 ring-border/70',
  {
    variants: {
      size: {
        sm: 'p-2',
        md: 'p-2.5',
        lg: 'p-3.5',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export const photoPlaceholderIcon = cva('', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-7',
    },
  },
  defaultVariants: { size: 'md' },
});

export const photoPlaceholderLabel = cva(
  'px-4 text-center font-medium tracking-wide text-muted-foreground',
  {
    variants: {
      size: {
        sm: 'text-[11px] leading-tight',
        md: 'text-xs',
        lg: 'text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
);
