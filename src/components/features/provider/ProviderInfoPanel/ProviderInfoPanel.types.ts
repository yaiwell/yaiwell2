/**
 * Tipos del componente ProviderInfoPanel.
 * Reutilizamos el `Provider` del dominio para evitar duplicar campos
 * (location, address, description...). El locale se pasa explícito
 * para resolver el campo `LocalizedText` de la descripción.
 */

import type { Provider } from '@/types/domain';

export interface ProviderInfoPanelProps {
  provider: Provider;
  locale: 'es' | 'ca';
}

/**
 * Props del mini-mapa privado. No se re-exporta desde index.ts
 * porque este componente solo lo consume `ProviderInfoPanel`.
 */
export interface ProviderInfoMapProps {
  lat: number;
  lng: number;
}
