import type { LucideIcon } from 'lucide-react';

/**
 * Tipos del componente HowItWorks.
 *
 * El `index` define qué clave de i18n usar (`home.howItWorks.steps.{index}`)
 * y el orden de aparición en la UI.
 */
export interface HowItWorksStep {
  index: 0 | 1 | 2;
  icon: LucideIcon;
}
