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
}
