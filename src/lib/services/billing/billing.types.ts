/**
 * Tipos del dominio `billing` (planes de negocio con Stripe Billing).
 *
 * El plan efectivo vive en `Provider.planId` (comisión y límites); la
 * tabla `provider_billing` es solo el espejo de lo que dice Stripe.
 */
import type { BillingSubscriptionStatus } from '@prisma/client';

import type { AppLocale } from '@/i18n/routing';
import type { PlanTierId } from '@/lib/services/plans';

/** Tiers que se pagan con suscripción (el Gratis no pasa por Stripe). */
export type PaidPlanTier = Exclude<PlanTierId, 'free'>;

/** Estado de la suscripción tal y como lo guardamos (espejo de Stripe). */
export type SubscriptionStatus = BillingSubscriptionStatus;

/**
 * Estados en los que la suscripción sigue «viva»: da derecho al plan
 * pagado. `past_due` incluido: mientras Stripe reintenta el cobro el
 * negocio conserva su plan; si los reintentos se agotan Stripe la pasa
 * a `canceled` o `unpaid` (según el Dashboard) y entonces baja a Gratis.
 *
 * `trialing` NO cuenta: no vendemos planes con prueba gratuita, así que
 * una suscripción en prueba solo puede venir de un cambio manual en el
 * Dashboard y no debe regalar un plan de pago. Se trata como
 * `incomplete` (espejo sí, plan efectivo sin cambios).
 */
export const LIVE_SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
] as const satisfies readonly SubscriptionStatus[];

/** Estados terminales o suspendidos: el negocio vuelve a Gratis. */
export const DEAD_SUBSCRIPTION_STATUSES = [
  'canceled',
  'incomplete_expired',
  'unpaid',
  'paused',
] as const satisfies readonly SubscriptionStatus[];

/** URLs de vuelta del Checkout de suscripción. */
export interface PlanCheckoutUrls {
  /** Debe contener `{CHECKOUT_SESSION_ID}` para poder confirmar la sesión. */
  successUrl: string;
  cancelUrl: string;
}

/** Sesión de Checkout creada para contratar un plan. */
export interface PlanCheckoutSession {
  sessionId: string;
  url: string;
}

/** Recorridos del Customer Portal que ofrecemos desde el panel. */
export type BillingPortalFlow =
  | { type: 'manage' }
  | { type: 'payment_method_update' }
  | { type: 'subscription_update_confirm'; tier: PaidPlanTier }
  | { type: 'subscription_cancel' };

/** Datos del dueño que necesita el Customer de Stripe. */
export interface ProviderForBilling {
  id: string;
  businessName: string;
  ownerEmail: string;
  ownerLocale: AppLocale;
}

/** Cambio de plan efectivo producido por una sincronización. */
export interface PlanChange {
  from: PlanTierId;
  to: PlanTierId;
}

/** Resultado de `syncSubscription`. */
export interface SubscriptionSyncResult {
  /** `false` si el reproceso no cambió nada (reentrega del webhook). */
  changed: boolean;
  providerId: string;
  /** Presente solo si `Provider.planId` cambió en esta sincronización. */
  planChanged?: PlanChange;
}

/** Resultado de procesar un evento de facturación del webhook. */
export interface BillingWebhookResult {
  handled: boolean;
  providerId?: string;
  planChanged?: PlanChange;
  /** Clave del aviso de cobro fallido que toca enviar (transición real). */
  paymentFailedKey?: string;
}

/** Resumen de facturación para el panel del negocio. */
export interface ProviderBillingSummary {
  /** Plan efectivo (`Provider.planId`): el que manda en comisión y límites. */
  plan: {
    tier: PlanTierId;
    monthlyPriceCents: number;
    commissionRateBps: number;
    maxServices: number;
  };
  activeServices: number;
  /** Servicios ocultos por el límite del plan (no los pausados a mano). */
  servicesPausedByPlan: number;
  hasCustomer: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  /** Plan que se paga en Stripe (en impago puede no coincidir con `plan`). */
  subscribedTier: PlanTierId | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  scheduledTier: PlanTierId | null;
  scheduledChangeAt: Date | null;
  lastPaymentFailedAt: Date | null;
}

/**
 * Desenlace de pasar a Stripe la comisión de una reserva en el local
 * (`onsite_commission_charges`, migración 9f).
 *
 *  - `itemized`: concepto creado ahora en el Customer del negocio.
 *  - `already_itemized`: la fila ya no estaba `pending` (otro camino se
 *    adelantó); no se ha hecho nada.
 *  - `retry_later`: Stripe falló; la fila sigue `pending` con
 *    `lastError` y la reintenta el cron.
 */
export type ItemizeCommissionOutcome = 'itemized' | 'already_itemized' | 'retry_later';

/**
 * Contrato de `itemizeCommission(chargeId)`, que implementa la pieza B
 * (`billing.commission.itemize.ts`). La llaman, **fuera** de toda
 * transacción y sin propagar errores al usuario:
 *  - la action de «Finalizar» del panel con `onsiteCommissionChargeId`
 *    de `markBookingCompleted`;
 *  - la action de deshacer «no presentado» si devolvió `completed`;
 *  - el cron, con los `commissionChargeIds` de
 *    `autoCompleteStaleOnsiteBookings` y las filas aún `pending`.
 *
 * Idempotente: clave `onsite-commission:<bookingId>` en Stripe.
 */
export type ItemizeCommission = (chargeId: string) => Promise<ItemizeCommissionOutcome>;
