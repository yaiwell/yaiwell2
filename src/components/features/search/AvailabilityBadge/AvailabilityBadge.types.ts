import type { AvailabilityStatus } from '@/types/domain';

export interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  /**
   * Minutos restantes hasta el próximo hueco. Solo se usa cuando
   * `status === 'available_soon'` para mostrar "En X min".
   */
  minutesUntilNext?: number | null;
  /** Variante visual: `solid` para mapa/CTA destacado, `subtle` para cards. */
  variant?: 'solid' | 'subtle';
}
