/**
 * Estilos del componente ForProvidersCTA.
 *
 * Banner cálido full-width. Usa los tokens `brand-*-soft` para que el
 * gradiente vire automáticamente en dark a plums oscuros. CTA primario
 * (alta) más prominente; CTA secundario (mailto ventas) en ghost para
 * no canibalizar la conversión principal.
 */
export const forProvidersCtaStyles = {
  root: 'bg-background pb-16 md:pb-24',
  container: 'mx-auto max-w-7xl px-6 md:px-8',
  banner:
    'relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-rose-soft via-brand-peach-soft to-brand-butter-soft px-6 py-14 text-center md:rounded-[2.5rem] md:px-12 md:py-20',
  eyebrow:
    'text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm',
  title:
    'max-w-2xl text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-xl text-balance text-base text-muted-foreground md:text-lg',
  actions: 'mt-2 flex flex-col items-center gap-3 sm:flex-row',
  ctaPrimary:
    'inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/90 hover:shadow-md focus-visible:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] md:h-14 md:px-10 md:text-base',
  ctaSecondary:
    'inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-8 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] md:h-14 md:px-10 md:text-base',
} as const;
