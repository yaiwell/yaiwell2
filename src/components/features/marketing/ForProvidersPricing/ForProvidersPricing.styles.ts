/**
 * Estilos del componente ForProvidersPricing.
 *
 * Grid 1/2/4 columnas. La card "popular" usa `border-2 border-primary`
 * y un badge superior. Mantenemos jerarquía visual con tipografía
 * grande para el precio y lista compacta para las features.
 *
 * Todos los colores son semantic tokens: `bg-card`, `text-foreground`,
 * `text-primary`, `border-border`, `bg-muted` y los `brand-*` para
 * acentos del icono de check.
 */
export const forProvidersPricingStyles = {
  root: 'bg-muted/40 py-16 md:py-24',
  container: 'mx-auto max-w-7xl px-6 md:px-8',
  header: 'mb-10 flex flex-col items-center gap-3 text-center md:mb-14',
  eyebrow:
    'text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm',
  title:
    'max-w-3xl text-balance text-3xl font-medium tracking-tight text-foreground md:text-4xl lg:text-5xl',
  subtitle: 'max-w-2xl text-balance text-base text-muted-foreground md:text-lg',
  grid: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6',

  // Card base (no popular): borde sutil, padding generoso.
  card: 'relative flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md md:p-7',
  // Variante popular: borde primario más grueso y leve sombra perma.
  cardPopular:
    'relative flex flex-col gap-5 rounded-3xl border-2 border-primary bg-card p-6 shadow-lg transition-all duration-300 hover:shadow-xl md:p-7',
  popularBadge:
    'absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm',

  // Header de la card.
  planName: 'text-xl font-medium tracking-tight text-foreground',
  planTagline: 'text-sm text-muted-foreground',

  // Bloque del precio: número grande + sufijo /mes pequeño.
  priceRow: 'flex items-baseline gap-1',
  priceValue: 'text-4xl font-medium tracking-tight text-foreground md:text-5xl',
  priceCurrency: 'text-2xl font-medium text-foreground md:text-3xl',
  priceSuffix: 'text-sm text-muted-foreground',
  commission:
    'inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-sage-soft px-2.5 py-1 text-xs font-medium text-brand-sage',

  // Lista de features.
  features: 'flex flex-1 flex-col gap-3 border-t border-border pt-5',
  feature: 'flex items-start gap-2.5 text-sm text-foreground',
  checkIcon: 'mt-0.5 size-4 shrink-0 text-primary',

  // CTA inferior.
  cta: 'mt-auto inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
  ctaGhost:
    'mt-auto inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition-all duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
} as const;
