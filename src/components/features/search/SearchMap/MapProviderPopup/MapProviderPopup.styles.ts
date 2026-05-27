/**
 * Estilos del popup premium del mapa.
 *
 * El popup se compone de:
 *  - una cabecera fotográfica con overlay y dos chips flotantes
 *    (disponibilidad arriba a la izquierda, rango de precio arriba a la derecha);
 *  - un cuerpo con tipo, nombre, dirección y meta;
 *  - un CTA opcional pegado abajo.
 *
 * El ancho lo controla `globals.css` vía `.leaflet-popup-content-wrapper`
 * (max-width 288px). Aquí solo nos preocupamos del layout interno.
 */
export const mapProviderPopupStyles = {
  root: 'flex w-full flex-col overflow-hidden rounded-2xl bg-card text-card-foreground',

  // Cabecera fotográfica.
  photoWrapper: 'relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted',
  photo: 'h-full w-full object-cover',
  photoFallback: 'h-full w-full bg-gradient-to-br from-muted to-secondary',
  // Overlay sutil para mejorar legibilidad de los chips flotantes. Mantenemos
  // negro/transparente puro por ser un gradiente de oscurecimiento foto-agnóstico
  // (no es color de tema, sino una sombra para garantizar contraste sobre cualquier
  // imagen). Funciona igual en light y dark mode.
  photoOverlay:
    'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10',
  badgeOverlay: 'absolute left-2 top-2 z-[1]',
  priceChip:
    'absolute right-2 top-2 z-[1] inline-flex items-center rounded-full bg-card/85 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur',

  // Cuerpo de información.
  body: 'flex flex-col gap-1 p-3',
  type: 'text-[10px] font-medium uppercase tracking-wider text-muted-foreground',
  name: 'font-display text-base leading-tight text-foreground line-clamp-1',
  address: 'text-xs text-muted-foreground line-clamp-1',

  // Meta (rating, reseñas, distancia).
  metaRow: 'mt-1 flex items-center gap-1.5 text-xs text-foreground/80',
  // Rating en brand-butter para mantener calor visual y coherencia con la
  // estrella del ProviderCard. En dark se aclara automáticamente.
  rating: 'inline-flex items-center gap-1 text-brand-butter font-medium',
  separator: 'text-muted-foreground/60',
  reviews: 'text-muted-foreground',
  distance: 'text-muted-foreground',

  // CTA opcional al final.
  cta: 'mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
} as const;
