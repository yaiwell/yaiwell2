import { cva } from 'class-variance-authority';

/**
 * Estilos de la región de aviso de la cola de reembolsos.
 */
export const retryFeedbackRegionStyles = {
  root: 'flex flex-col gap-4',
  dismiss:
    'shrink-0 rounded-full px-2 py-1 text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
} as const;

/** Banda del aviso con variantes por tono del desenlace. */
export const retryFeedbackRegionBanner = cva(
  'flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm',
  {
    variants: {
      tone: {
        success: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200',
        warning: 'border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200',
        error: 'border-destructive/30 bg-destructive/10 text-destructive',
      },
    },
    defaultVariants: { tone: 'success' },
  },
);
