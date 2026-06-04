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

/**
 * Genera el HTML del marker que representa al USUARIO en el mapa.
 *
 * Dos variantes:
 *  - GPS real (`isReal=true`): punto central azul con halo pulsante,
 *    imitando el "you are here" de Google Maps. Halo y punto comparten
 *    el token `--brand-sky` para mantener coherencia con el chip
 *    "Cerca de ti" y la paleta de marca.
 *  - Fallback BCN (`isReal=false`): un pin neutro y discreto en
 *    `--muted-foreground` sin animación, para señalar que no es la
 *    posición real del usuario. El tooltip lo explicita.
 *
 * Igual que `buildPinHtml`, referenciamos las CSS variables para que
 * respeten light/dark sin tener que pasar el tema como prop.
 */
export function buildUserLocationHtml(isReal: boolean): string {
  if (!isReal) {
    return `
      <span style="
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:18px;height:18px;
        border-radius:9999px;
        background:var(--muted-foreground);
        opacity:0.7;
        border:2px solid var(--card);
        box-shadow:0 1px 3px rgba(0,0,0,0.2);
      "></span>
    `;
  }

  // Halo pulsante + punto central. La animación vive en globals.css
  // (`@keyframes yaiwell-user-pulse`) porque Leaflet inyecta HTML
  // crudo y los keyframes en `<style>` inline no se aplican siempre.
  return `
    <span style="
      position:relative;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:44px;height:44px;
    ">
      <span class="yaiwell-user-pin-halo" style="
        position:absolute;
        inset:0;
        border-radius:9999px;
        background:var(--brand-sky);
        opacity:0.25;
      "></span>
      <span style="
        position:relative;
        width:16px;height:16px;
        border-radius:9999px;
        background:var(--brand-sky);
        border:3px solid var(--card);
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
      "></span>
    </span>
  `;
}
