import type { ProviderWithDistance } from '../SearchView/SearchView.types';

export interface ProviderListProps {
  /**
   * Proveedores enriquecidos con la distancia real al usuario.
   *
   * El orquestador (`SearchView`) ya los entrega ordenados por
   * proximidad, así que aquí solo iteramos.
   */
  providers: ProviderWithDistance[];
  /**
   * Mapa providerId → precio "desde" en céntimos.
   * Lo prepara el orquestador para no recalcular en cada card.
   */
  fromPriceMap: Record<string, number | null>;
  /** Id del proveedor que está siendo "hovered" (en card o en pin). */
  highlightedId: string | null;
  /** Comunicación de hover hacia el orquestador → mapa. */
  onHoverProvider: (providerId: string | null) => void;
  /**
   * Verdadero si la ubicación viene del GPS del navegador. Falso
   * cuando se está usando el centro de Barcelona como fallback; en
   * ese caso las cards marcan la distancia con un asterisco.
   */
  hasRealLocation: boolean;
}
