import type { LucideIcon } from 'lucide-react';

/**
 * Slug estable de cada beneficio. Se usa para mapear i18n y data-component.
 * Cambiar un slug rompe los tests; cambiar el orden no.
 */
export type BenefitSlug = 'liveBookings' | 'noCalls' | 'yourHours' | 'noLockIn';

export interface BenefitItem {
  slug: BenefitSlug;
  icon: LucideIcon;
  /**
   * Índice de tono dentro de la paleta brand. Determina los colores
   * pastel del badge del icono (sage / rose / sky / butter).
   */
  toneIndex: 0 | 1 | 2 | 3;
}
