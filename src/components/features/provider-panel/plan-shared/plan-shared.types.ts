/**
 * Tipos compartidos por los componentes del plan del panel
 * (PlanSummaryCard, PlanPicker, BillingStatusBanner).
 */
import type {
  BillingPortalIntent,
  PlanActionErrorCode,
  PlanActionResult,
} from '@/app/[locale]/panel/plan/actions';

export type { BillingPortalIntent, PlanActionErrorCode, PlanActionResult };

/**
 * Clave del botón que está esperando a Stripe. Permite pintar el
 * spinner solo en el botón pulsado y deshabilitar el resto.
 */
export type PlanActionKey = `checkout:${string}` | `portal:${BillingPortalIntent}:${string}`;
