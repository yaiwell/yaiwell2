/**
 * Estilos de ProviderCard.
 *
 * Card vertical con foto, metadatos y badge de disponibilidad.
 * Diseñada mobile-first: en móvil ocupa el 100% del ancho del
 * contenedor, en desktop sigue siendo vertical pero más compacta.
 */
export const providerCardStyles = {
  root: 'group relative flex w-full flex-col overflow-hidden rounded-3xl border border-stone-200/70 bg-white shadow-sm transition-all duration-200 hover:shadow-md',
  rootHighlighted: 'ring-2 ring-stone-900/40 shadow-md',
  imageWrapper: 'relative aspect-[16/10] w-full overflow-hidden bg-stone-100',
  image: 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
  badgeOverlay: 'absolute left-3 top-3',
  priceTag:
    'absolute right-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-stone-800 backdrop-blur',
  body: 'flex flex-col gap-3 p-5',
  headerRow: 'flex items-start justify-between gap-3',
  name: 'font-serif text-lg leading-tight text-stone-900',
  type: 'text-[0.7rem] uppercase tracking-wider text-stone-500',
  address: 'text-sm leading-snug text-stone-600',
  metaRow: 'flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-700',
  rating: 'inline-flex items-center gap-1 font-medium',
  ratingStar: 'size-3.5 fill-amber-400 stroke-amber-400',
  reviews: 'text-stone-500',
  separator: 'text-stone-300',
  distance: 'text-stone-500',
  footerRow: 'mt-1 flex items-center justify-between gap-3 border-t border-stone-100 pt-4',
  fromPrice: 'flex items-baseline gap-1 text-stone-700',
  fromPriceLabel: 'text-xs text-stone-500',
  fromPriceValue: 'text-lg font-semibold text-stone-900',
  ctaLink:
    'inline-flex items-center gap-1 text-sm font-medium text-stone-900 transition-colors hover:text-stone-700',
} as const;
