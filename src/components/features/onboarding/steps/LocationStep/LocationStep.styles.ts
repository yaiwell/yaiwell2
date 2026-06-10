/**
 * Estilos del paso 3 — ubicación. El input de autocomplete y un panel
 * de pista para que el usuario sepa que necesita seleccionar una
 * sugerencia para fijar las coordenadas.
 */
export const locationStepStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-2',
  title: 'font-display text-2xl leading-tight text-foreground sm:text-3xl',
  subtitle: 'text-sm text-muted-foreground',
  field: 'flex flex-col gap-1.5',
  helper: 'text-xs text-muted-foreground',
  warning:
    'rounded-xl border border-amber-400/40 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
  hintPanel:
    'rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground',
} as const;
