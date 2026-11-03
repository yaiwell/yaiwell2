import { cva } from 'class-variance-authority';

/**
 * Estilos de ProfessionalAvatar.
 *
 * Círculo con foto o, si no hay, iniciales sobre el melocotón suave de
 * la marca (mismo tratamiento que el avatar de la ficha de servicio y de
 * las reseñas). Solo tokens semánticos: funciona en claro y oscuro sin
 * variantes `dark:`.
 */
export const professionalAvatarRoot = cva(
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-peach-soft font-semibold text-foreground/70 ring-1 ring-border select-none',
  {
    variants: {
      size: {
        sm: 'size-8 text-xs',
        md: 'size-12 text-sm',
        lg: 'size-14 text-lg md:size-16',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/** El `<img>` ocupa el círculo con `object-cover` para no deformarse. */
export const professionalAvatarImage = 'h-full w-full object-cover';
