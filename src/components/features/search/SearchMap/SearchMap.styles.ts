/**
 * Estilos del contenedor del mapa.
 *
 * El propio mapa de Leaflet llena su contenedor con `h-full w-full`;
 * por eso el wrapper aquí establece la altura responsive.
 *
 * El contenido del Popup vive en `MapProviderPopup/MapProviderPopup.styles.ts`.
 * Aquí solo quedan los estilos del chrome exterior del mapa.
 */
export const searchMapStyles = {
  wrapper:
    'relative h-full min-h-[60dvh] w-full overflow-hidden rounded-3xl border border-border bg-muted',
  attribution:
    'pointer-events-none absolute bottom-2 right-3 rounded-full bg-card/80 px-2 py-0.5 text-[0.65rem] text-muted-foreground backdrop-blur',
} as const;

/**
 * Genera el HTML del divIcon para un pin de Leaflet en función del
 * estado de disponibilidad y si está resaltado.
 *
 * Leaflet inyecta el HTML directamente al DOM y sus elementos no
 * heredan utilidades de Tailwind, por lo que referenciamos las CSS
 * variables del tema (`--brand-sage`, `--brand-butter`, `--muted-foreground`,
 * `--card`, `--ring`) para que los pines respeten el modo oscuro.
 */
export function buildPinHtml(
  status: 'available_now' | 'available_soon' | 'busy',
  highlighted: boolean,
): string {
  // Mapeo a tokens de marca, coherente con AvailabilityBadge.
  const color =
    status === 'available_now'
      ? 'var(--brand-sage)'
      : status === 'available_soon'
        ? 'var(--brand-butter)'
        : 'var(--muted-foreground)';
  // El halo del pin resaltado usa el token `--ring` (rosa pastel) en
  // ambos modos para mantener contraste sin acudir a negro puro.
  const ring = highlighted
    ? '0 0 0 4px color-mix(in oklch, var(--ring) 55%, transparent)'
    : '0 1px 3px rgba(0,0,0,0.18)';
  const scale = highlighted ? 1.15 : 1;
  return `
    <span style="
      display:inline-flex;
      width:18px;height:18px;
      border-radius:9999px;
      background:${color};
      border:2px solid var(--card);
      box-shadow:${ring};
      transform:scale(${scale});
      transition:transform 150ms ease;
    "></span>
  `;
}
