/**
 * Estilos del contenedor del mapa.
 *
 * El propio mapa de Leaflet llena su contenedor con `h-full w-full`;
 * por eso el wrapper aquí establece la altura responsive.
 */
export const searchMapStyles = {
  wrapper:
    'relative h-full min-h-[60dvh] w-full overflow-hidden rounded-3xl border border-border bg-muted',
  attribution:
    'pointer-events-none absolute bottom-2 right-3 rounded-full bg-white/80 px-2 py-0.5 text-[0.65rem] text-muted-foreground backdrop-blur',
  // Contenido interno del Popup de Leaflet. El chrome (caja blanca y
  // cierre) se restilan con CSS global en globals.css porque Leaflet
  // inyecta clases propias que no podemos pasar por props.
  popup: 'flex min-w-[200px] flex-col gap-2',
  popupHeader: 'flex flex-col gap-0.5',
  popupType: 'text-[10px] font-medium uppercase tracking-wider text-muted-foreground',
  popupName: 'font-display text-base text-foreground',
  popupAddress: 'text-xs text-muted-foreground',
  popupMeta: 'flex items-center gap-2 text-xs text-foreground/80',
  popupRating: 'inline-flex items-center gap-1 text-amber-600',
  popupReviews: 'text-muted-foreground',
  popupPriceRange: 'ml-auto text-foreground/70',
} as const;

/**
 * Genera el HTML del divIcon para un pin de Leaflet en función del
 * estado de disponibilidad y si está resaltado.
 *
 * Definimos los colores inline porque Leaflet inyecta el HTML sin
 * pasar por Tailwind. Mantenemos paleta coherente con AvailabilityBadge.
 */
export function buildPinHtml(
  status: 'available_now' | 'available_soon' | 'busy',
  highlighted: boolean,
): string {
  const color =
    status === 'available_now' ? '#059669' : status === 'available_soon' ? '#d97706' : '#a8a29e';
  const ring = highlighted ? '0 0 0 4px rgba(28,25,23,0.35)' : '0 1px 3px rgba(0,0,0,0.18)';
  const scale = highlighted ? 1.15 : 1;
  return `
    <span style="
      display:inline-flex;
      width:18px;height:18px;
      border-radius:9999px;
      background:${color};
      border:2px solid white;
      box-shadow:${ring};
      transform:scale(${scale});
      transition:transform 150ms ease;
    "></span>
  `;
}
