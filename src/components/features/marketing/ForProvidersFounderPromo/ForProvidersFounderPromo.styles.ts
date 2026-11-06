/**
 * Estilos del aviso del regalo de Mallorca. Solo tokens semánticos, para que
 * funcione igual en modo claro y oscuro.
 */
export const forProvidersFounderPromoStyles = {
  root: 'mx-auto w-full max-w-7xl px-6 py-10 md:px-8 md:py-14',
  card: 'flex flex-col items-start gap-4 rounded-3xl border-2 border-primary bg-card p-6 md:p-10',
  eyebrow: 'inline-flex items-center gap-2 text-sm font-medium text-primary',
  title: 'max-w-3xl text-balance text-2xl font-medium tracking-tight text-foreground md:text-4xl',
  body: 'max-w-2xl text-base text-muted-foreground md:text-lg',
  remaining: 'text-lg font-semibold text-foreground',
  cta: 'inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  conditions: 'max-w-3xl text-sm text-muted-foreground',
} as const;
