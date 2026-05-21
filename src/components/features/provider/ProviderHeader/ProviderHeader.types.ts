import type { ProviderWithAvailability } from '@/types/domain';

/**
 * Props del componente `ProviderHeader`.
 *
 * El header es puramente presentacional: recibe el proveedor ya
 * enriquecido con su disponibilidad y se limita a renderizar.
 */
export interface ProviderHeaderProps {
  provider: ProviderWithAvailability;
}
