/**
 * Tipos del componente ProviderInfoPanel.
 * Reutilizamos el `Provider` del dominio para evitar duplicar campos
 * (location, address, description...). El locale se pasa explícito
 * para resolver el campo `LocalizedText` de la descripción.
 */

import type { WeeklySchedule } from '@/lib/services/availability';
import type { Provider } from '@/types/domain';

export interface ProviderInfoPanelProps {
  provider: Provider;
  /**
   * Horario semanal real del provider (del primer Professional). `null`
   * si el provider no tiene Professional asociado (caso patológico
   * que el page tolera devolviendo null) o si todos los días están
   * cerrados — en ambos casos la UI esconde el bloque.
   */
  schedule: WeeklySchedule | null;
  locale: 'es' | 'ca' | 'en' | 'de';
}

/**
 * Props del mini-mapa privado. No se re-exporta desde index.ts
 * porque este componente solo lo consume `ProviderInfoPanel`.
 */
export interface ProviderInfoMapProps {
  lat: number;
  lng: number;
}
