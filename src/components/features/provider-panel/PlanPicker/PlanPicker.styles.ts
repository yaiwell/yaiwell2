import { cva } from 'class-variance-authority';

/**
 * Estilos del selector de planes y de la tarjeta de plan.
 *
 * Una columna en móvil, dos en tablet y cuatro en escritorio. Tokens
 * semánticos (`bg-card`, `border-primary`, `text-muted-foreground`) para
 * que claro y oscuro salgan del tema sin variantes `dark:`.
 */
export const planPickerStyles = {
  root: 'flex flex-col gap-4',
  header: 'flex flex-col gap-1',
  title: 'font-display text-xl text-foreground',
  subtitle: 'text-sm text-muted-foreground',
  grid: 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4',
  hint: 'text-sm text-muted-foreground',
  ctaRow: 'mt-auto flex flex-col gap-2 pt-2',
  ctaFull: 'w-full',
} as const;

export const planCardStyles = {
  header: 'flex flex-col gap-1',
  name: 'text-lg font-medium tracking-tight text-foreground',
  priceRow: 'flex flex-wrap items-baseline gap-x-1',
  price: 'text-3xl font-medium tracking-tight text-foreground',
  priceSuffix: 'text-sm text-muted-foreground',
  vat: 'text-xs text-muted-foreground',
  facts: 'flex flex-col gap-2 border-t border-border pt-4 text-sm text-foreground',
  fact: 'flex items-start gap-2',
  factIcon: 'mt-0.5 size-4 shrink-0 text-primary',
  badge:
    'absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground',
} as const;

/** Tarjeta con borde según su papel (actual, seleccionada o normal). */
export const planCardVariants = cva(
  'relative flex h-full flex-col gap-4 rounded-3xl bg-card p-5 transition-shadow duration-200',
  {
    variants: {
      emphasis: {
        none: 'border border-border',
        current: 'border-2 border-foreground/70',
        selected: 'border-2 border-primary shadow-md',
      },
    },
    defaultVariants: { emphasis: 'none' },
  },
);
