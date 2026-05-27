/**
 * Estilos de ProviderCard.
 *
 * Card vertical con foto, metadatos y badge de disponibilidad.
 * Diseñada mobile-first: en móvil ocupa el 100% del ancho del
 * contenedor, en desktop sigue siendo vertical pero más compacta.
 *
 * Paleta semántica: usa tokens de la marca (`bg-card`, `text-foreground`,
 * `text-muted-foreground`, `border-border`) en lugar de `stone-*` para
 * mantener coherencia visual con landing y futuro modo oscuro.
 */
export const providerCardStyles = {
  root: 'group relative flex w-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:shadow-md',
  rootHighlighted: 'ring-2 ring-primary/30 shadow-md',
  imageWrapper: 'relative aspect-[16/10] w-full overflow-hidden bg-muted',
  image: 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
  badgeOverlay: 'absolute left-3 top-3',
  priceTag:
    'absolute right-3 top-3 inline-flex items-center rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur',
  body: 'flex flex-col gap-3 p-5',
  headerRow: 'flex items-start justify-between gap-3',
  name: 'font-display text-lg leading-tight text-foreground',
  type: 'text-xs uppercase tracking-wider text-muted-foreground',
  address: 'text-sm leading-snug text-muted-foreground',
  metaRow: 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/80',
  rating: 'inline-flex items-center gap-1 font-medium',
  // Estrella de rating: brand-butter para mantener calor visual y coherencia
  // con la paleta. En dark mode brand-butter se aclara y sigue legible.
  ratingStar: 'size-3.5 fill-brand-butter stroke-brand-butter',
  reviews: 'text-muted-foreground',
  separator: 'text-border',
  distance: 'text-muted-foreground',
  // Pill compacta para la distancia al usuario. Mantenemos tokens
  // semánticos (`bg-muted`, `text-foreground`) para que respete el
  // par light/dark sin colores hardcoded. El icono va alineado a la
  // baseline del texto con `size-3.5` para no engordar la card.
  distancePill:
    'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80',
  distancePillIcon: 'size-3.5 text-muted-foreground',
  footerRow: 'mt-1 flex items-center justify-between gap-3 border-t border-border/60 pt-4',
  fromPrice: 'flex items-baseline gap-1 text-foreground/80',
  fromPriceLabel: 'text-xs text-muted-foreground',
  fromPriceValue: 'text-lg font-semibold text-foreground',
  ctaLink:
    'inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:underline',
} as const;
