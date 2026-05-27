import type { ProviderWithAvailability } from '@/types/domain';

export interface ProviderCardProps {
  provider: ProviderWithAvailability;
  /** Precio "desde" en céntimos. `null` si el proveedor no tiene servicios. */
  fromPriceCents: number | null;
  /**
   * Resaltado opcional: la card cambia su sombra cuando el mapa pone
   * el pin equivalente en hover. Lo gestiona el orquestador.
   */
  highlighted?: boolean;
  /** Callback al pasar el ratón por la card (para resaltar el pin del mapa). */
  onHover?: (providerId: string | null) => void;
  /**
   * Distancia (en metros) del usuario a este proveedor, calculada en
   * cliente con la posición del `UserLocationProvider`. Opcional para
   * que la card siga funcionando en contextos sin geolocalización
   * (favoritos, panel proveedor, etc.).
   */
  distanceMeters?: number;
  /**
   * Verdadero si la distancia se calculó con la posición real del GPS.
   * Falso cuando estamos usando el centro de Barcelona como fallback;
   * en ese caso la card pinta un asterisco y un tooltip informativo.
   */
  hasRealLocation?: boolean;
}
