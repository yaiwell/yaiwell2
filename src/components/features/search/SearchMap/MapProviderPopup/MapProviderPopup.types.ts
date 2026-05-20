import type { ProviderWithAvailability } from '@/types/domain';

/**
 * Props del popup que se pinta dentro del `<Popup>` de Leaflet
 * al hacer click sobre un pin del mapa.
 */
export interface MapProviderPopupProps {
  /** Proveedor enriquecido con disponibilidad y distancia. */
  provider: ProviderWithAvailability;
  /**
   * Callback opcional para la acción principal (p. ej. abrir ficha o
   * iniciar reserva). Si no se pasa, el CTA no se renderiza.
   */
  onPrimaryAction?: () => void;
  /** Texto del CTA primario. Solo se usa si `onPrimaryAction` existe. */
  primaryActionLabel?: string;
}
