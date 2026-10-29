/**
 * Estilos del paso 5 — elección de plan. Las tarjetas son las del panel
 * (`PlanCard`); aquí solo vive la rejilla y el radio accesible.
 */
export const planStepStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-2',
  title: 'font-display text-2xl leading-tight text-foreground sm:text-3xl',
  subtitle: 'text-sm text-muted-foreground',
  fieldset: 'grid gap-4 sm:grid-cols-2',
  legend: 'sr-only',
  // El radio nativo queda oculto; el foco de teclado se ve en la tarjeta.
  option:
    'block cursor-pointer rounded-3xl has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
  radio: 'sr-only',
  note: 'rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground',
} as const;
