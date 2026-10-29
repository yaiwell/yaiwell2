/**
 * Tipos de la cabecera de `/panel/plan`.
 */
import type { PlanTierId } from '@/lib/services/plans';

/**
 * Aviso de la vuelta de Stripe:
 *  - `checkoutCancelled`: el negocio salió del pago sin pagar.
 *  - `checkoutFailed`: no se pudo abrir el pago (desde el onboarding).
 *  - `confirmFailed`: la sesión de pago no corresponde a este negocio.
 */
export type PlanPageNotice = 'checkoutCancelled' | 'checkoutFailed' | 'confirmFailed';

export interface PlanPageHeaderProps {
  notice?: PlanPageNotice | null;
  /** Plan que nombra el aviso `checkoutFailed`. */
  noticePlan?: PlanTierId | null;
}
