import { cva } from 'class-variance-authority';

/**
 * Estilos del componente ErrorView.
 *
 * Todo se apoya en tokens semánticos (`bg-card`, `text-foreground`,
 * `bg-primary`, `border-border`…) para que el par claro/oscuro funcione
 * sin variantes `dark:` escritas a mano. Los `stone-*` de Fase 0 ya no
 * tienen sitio aquí.
 *
 * La variante `page` reutiliza el lenguaje visual de `NotFoundView`
 * (tarjeta con gradiente cálido, radios generosos): un error de BD no
 * debería sentirse más frío que un 404. La variante `panel` es sobria
 * porque se monta dentro del shell del proveedor, que ya tiene su
 * propio marco.
 */
export const errorViewRoot = cva('flex w-full flex-col', {
  variants: {
    variant: {
      page: 'mx-auto max-w-5xl flex-1 items-center justify-center px-4 py-12 md:px-8 md:py-20',
      panel: 'items-stretch py-6',
    },
  },
  defaultVariants: { variant: 'page' },
});

export const errorViewCard = cva('flex w-full flex-col overflow-hidden', {
  variants: {
    variant: {
      page: 'from-brand-peach-soft via-brand-rose-soft to-brand-sky-soft max-w-3xl items-center gap-6 rounded-3xl bg-gradient-to-br px-6 py-14 text-center md:gap-8 md:rounded-[2.5rem] md:px-12 md:py-20',
      panel: 'border-border bg-card gap-4 rounded-2xl border px-6 py-8 text-center',
    },
  },
  defaultVariants: { variant: 'page' },
});

export const errorViewIcon = cva('inline-flex items-center justify-center rounded-full', {
  variants: {
    variant: {
      page: 'bg-background/70 size-16 shadow-sm backdrop-blur md:size-20',
      panel: 'bg-muted text-muted-foreground size-11 self-center',
    },
  },
  defaultVariants: { variant: 'page' },
});

export const errorViewTitle = cva('text-foreground font-display text-balance', {
  variants: {
    variant: {
      page: 'max-w-2xl text-3xl leading-tight font-medium tracking-tight md:text-4xl',
      panel: 'text-xl leading-tight font-medium tracking-tight',
    },
  },
  defaultVariants: { variant: 'page' },
});

export const errorViewDescription = cva('text-muted-foreground text-balance', {
  variants: {
    variant: {
      page: 'max-w-xl text-base md:text-lg',
      panel: 'mx-auto max-w-md text-sm',
    },
  },
  defaultVariants: { variant: 'page' },
});

/**
 * Estilos que no dependen de la variante.
 *
 * Los CTAs comparten altura de 48px (44px mínimo recomendado para
 * touch) y anillo de foco sobre `--ring`.
 */
export const errorViewStyles = {
  digest:
    'bg-background/70 text-muted-foreground mx-auto rounded-full px-3 py-1.5 font-mono text-xs',

  actions:
    'flex w-full flex-col items-stretch gap-3 sm:mx-auto sm:w-auto sm:flex-row sm:items-center',

  primaryCta:
    'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold transition-all duration-150 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]',

  secondaryCta:
    'border-border bg-background/70 text-foreground hover:bg-background focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-12 items-center justify-center rounded-full border px-7 text-sm font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98]',
} as const;
