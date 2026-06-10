/**
 * Estilos del orquestador del wizard.
 *
 * Layout: card centrada mobile-first con max-w razonable; header con
 * el stepper; footer con los botones Back/Next anclados.
 */
export const onboardingWizardStyles = {
  root: 'flex min-h-[calc(100vh-4rem)] w-full justify-center bg-background px-4 py-6 sm:py-12',
  shell:
    'flex w-full max-w-3xl flex-col gap-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10',
  header: 'flex flex-col gap-5',
  eyebrow:
    'inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground',
  body: 'flex flex-col gap-6',
  footer:
    'flex flex-col-reverse items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between',
  // Cluster de acciones secundarias (Back, Skip).
  footerLeft: 'flex items-center gap-2',
  // Cluster de acción primaria (Next, Publish).
  footerRight: 'flex items-center gap-2',
  backButton:
    'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
  primaryButton:
    'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
  // Banner de error global del paso (errores tipados del backend).
  errorBanner:
    'rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive',
  // Pantalla de "syncing…".
  syncingCard:
    'flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center',
  syncingTitle: 'font-display text-2xl text-foreground',
  syncingSubtitle: 'max-w-sm text-sm text-muted-foreground',
  syncingSpinner: 'inline-flex size-5 animate-spin items-center justify-center text-primary',
} as const;
