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
}
