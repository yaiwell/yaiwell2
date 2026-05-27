import type { GeoPoint, ProviderWithAvailability } from '@/types/domain';

export interface SearchMapProps {
  providers: ProviderWithAvailability[];
  /** Centro inicial del mapa (BCN si no se geolocaliza). */
  initialCenter: GeoPoint;
  /** Zoom inicial. */
  initialZoom: number;
  /** Id del proveedor "hovered" en la lista → resaltar el pin. */
  highlightedId: string | null;
  /** Hover desde el pin → comunicar a la lista. */
  onHoverProvider: (providerId: string | null) => void;
  /** Callback cuando el usuario pulsa el CTA del popup. */
  onProviderSeeOnList?: (providerId: string) => void;
  /**
   * Posición del usuario (real o fallback BCN). Si se pasa, el mapa
   * pinta un marker propio y se recentra cuando cambia. Omitirla
   * desactiva la integración (útil en tests u otros contextos).
   */
  userLocation?: GeoPoint;
  /**
   * `true` si `userLocation` proviene del GPS real. Cambia el marker
   * (halo pulsante azul vs pin neutro discreto con tooltip "estimación").
   */
  hasRealLocation?: boolean;
}
