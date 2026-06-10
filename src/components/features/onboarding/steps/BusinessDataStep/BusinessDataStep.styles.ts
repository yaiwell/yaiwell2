/**
 * Estilos del paso 2 — formulario denso pero respirado.
 */
export const businessDataStepStyles = {
  root: 'flex flex-col gap-6',
  header: 'flex flex-col gap-2',
  title: 'font-display text-2xl leading-tight text-foreground sm:text-3xl',
  subtitle: 'text-sm text-muted-foreground',
  form: 'flex flex-col gap-5',
  field: 'flex flex-col gap-1.5',
  label: 'text-sm font-medium text-foreground',
  helper: 'text-xs text-muted-foreground',
  helperAvailable: 'text-xs font-medium text-emerald-600 dark:text-emerald-400',
  helperTaken: 'text-xs font-medium text-destructive',
  helperChecking: 'text-xs text-muted-foreground',
  input:
    'h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
  // Prefix + input con el slug. El input ocupa el resto del ancho.
  slugRow: 'flex h-11 w-full overflow-hidden rounded-xl border border-border bg-background',
  slugRowInvalid: 'border-destructive ring-2 ring-destructive/20',
  slugPrefix: 'inline-flex items-center bg-muted/60 px-3 text-xs font-medium text-muted-foreground',
  slugInput:
    'flex-1 bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none',
  textarea:
    'min-h-[96px] w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
  charCount: 'self-end text-[11px] text-muted-foreground',
  // Grupo de chips para priceRange.
  priceGroup: 'flex flex-wrap gap-2',
  priceChip:
    'inline-flex h-10 items-center justify-center rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted',
  priceChipSelected: 'border-primary bg-primary/15 text-primary',
  errorText: 'text-xs font-medium text-destructive',
} as const;
