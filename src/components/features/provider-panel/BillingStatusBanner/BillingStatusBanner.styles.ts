import { cva } from 'class-variance-authority';

/**
 * Estilos del aviso de facturación. Los tonos usan los tokens
 * `--status-*` y `destructive` de `globals.css` (contraste AA en claro y
 * oscuro).
 */
export const billingStatusBanner = cva(
  'flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
  {
    variants: {
      tone: {
        info: 'border-status-info-foreground/30 bg-status-info text-status-info-foreground',
        ok: 'border-status-now-foreground/30 bg-status-now text-status-now-foreground',
        warning: 'border-status-soon-foreground/30 bg-status-soon text-status-soon-foreground',
        error: 'border-destructive/40 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

export const billingStatusBannerStyles = {
  content: 'flex items-start gap-3',
  icon: 'mt-0.5 size-5 shrink-0',
  iconSpin: 'mt-0.5 size-5 shrink-0 animate-spin',
  text: 'flex flex-col gap-0.5',
  title: 'font-medium',
  body: 'opacity-90',
  actions: 'flex flex-col gap-2 sm:flex-row sm:items-center sm:shrink-0',
  link: 'inline-flex min-h-11 items-center justify-center gap-1 rounded-full px-4 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  linkIcon: 'size-4',
  error: 'basis-full text-sm',
} as const;
