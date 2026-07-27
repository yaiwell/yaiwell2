import type { AvailabilityStatus } from '@/types/domain';

export interface AvailabilityBadgeProps {
  status: AvailabilityStatus;
  /**
   * Minutos restantes hasta el próximo hueco. Solo se usa cuando
   * `status === 'available_soon'` para mostrar "En X min".
   */
  minutesUntilNext?: number | null;
  /**
   * Instante del próximo hueco. Solo se usa cuando `status === 'busy'`
   * para mostrar "Libre a las 19:00" en lugar de "Sin hueco hoy".
   * Si viene `null`, es que de verdad no queda hueco.
   */
  nextSlotAt?: Date | null;
  /** Variante visual: `solid` para mapa/CTA destacado, `subtle` para cards. */
  variant?: 'solid' | 'subtle';
}
