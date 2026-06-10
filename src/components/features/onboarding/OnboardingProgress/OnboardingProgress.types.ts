import type { OnboardingStep } from '../shared';

/**
 * Props públicas del stepper. El componente es puramente presentacional
 * (no toca estado ni hooks de navegación) y recibe el paso actual + el
 * total de pasos para pintar la barra de progreso.
 */
export interface OnboardingProgressProps {
  current: OnboardingStep;
  total: number;
}
