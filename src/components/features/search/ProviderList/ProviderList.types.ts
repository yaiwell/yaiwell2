import type { ProviderWithAvailability } from '@/types/domain';

export interface ProviderListProps {
  providers: ProviderWithAvailability[];
  /**
   * Mapa providerId → precio "desde" en céntimos.
   * Lo prepara el orquestador para no recalcular en cada card.
   */
  fromPriceMap: Record<string, number | null>;
  /** Id del proveedor que está siendo "hovered" (en card o en pin). */
  highlightedId: string | null;
  /** Comunicación de hover hacia el orquestador → mapa. */
  onHoverProvider: (providerId: string | null) => void;
}
