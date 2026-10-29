/**
 * Estilos comunes de los bloques del plan: botones y avisos con los
 * mismos tokens semánticos que `StripeConnectCard` (claro y oscuro).
 */
export const planSharedStyles = {
  primaryCta:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors duration-150 hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  secondaryCta:
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
  errorNotice:
    'rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive',
  spinner: 'size-4 animate-spin',
} as const;
