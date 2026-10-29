/**
 * Lógica pura del selector de planes. Sin `'use client'`: no tiene
 * estado, la usan el Client Component y los tests.
 */
import type { SubscriptionStatus } from '@/lib/services/billing';
import type { PlanTierId } from '@/lib/services/plans';

import type { PlanCtaKind, PlanSchedule } from './PlanPicker.types';

const NO_SCHEDULE: PlanSchedule = { scheduledTier: null, cancelAtPeriodEnd: false };

/**
 * Decide el botón de la tarjeta de `targetTier` según el plan efectivo
 * y la suscripción. El orden importa:
 *  1. El plan actual nunca tiene acción.
 *  2. Con el cobro fallando (`past_due`) lo primero es la tarjeta: un
 *     cambio de plan con una factura impagada solo complica el cobro.
 *  3. Con un cambio ya programado (bajada o cancelación a fin de
 *     periodo) no se apila otro: se ve cuál es y el resto se bloquea.
 *  4. Sin suscripción viva, los planes de pago se contratan con
 *     Checkout. Un plan de pago sin suscripción es incoherente (lo
 *     resuelve soporte): no ofrecemos «pasar a Gratis».
 *  5. Con suscripción viva todo va por el portal: Gratis = cancelar,
 *     otro plan de pago = confirmar el cambio (prorratea).
 *
 * @param currentTier — plan efectivo (`Provider.planId`).
 * @param targetTier — plan de la tarjeta.
 * @param status — estado de la suscripción en el espejo (o `null`).
 * @param hasLiveSubscription — la suscripción da derecho al plan pagado.
 * @param schedule — cambio programado en Stripe, si lo hay.
 */
export function getPlanCta(
  currentTier: PlanTierId,
  targetTier: PlanTierId,
  status: SubscriptionStatus | null,
  hasLiveSubscription: boolean,
  schedule: PlanSchedule = NO_SCHEDULE,
): PlanCtaKind {
  if (targetTier === currentTier) return 'current';
  if (status === 'past_due') return 'fix_payment';

  if (hasLiveSubscription) {
    const pendingTier: PlanTierId | null = schedule.cancelAtPeriodEnd
      ? 'free'
      : schedule.scheduledTier;
    if (pendingTier !== null && pendingTier !== currentTier) {
      return targetTier === pendingTier ? 'scheduled' : 'locked';
    }
    return targetTier === 'free' ? 'downgrade_free' : 'change';
  }

  if (targetTier === 'free') return 'unavailable';
  return 'subscribe';
}

/** Hay un cambio programado que bloquea elegir otro plan. */
export function hasScheduledChange(currentTier: PlanTierId, schedule: PlanSchedule): boolean {
  const pendingTier = schedule.cancelAtPeriodEnd ? 'free' : schedule.scheduledTier;
  return pendingTier !== null && pendingTier !== currentTier;
}

/** Los botones que llevan a Stripe; el resto se pinta deshabilitado. */
export function isActionableCta(kind: PlanCtaKind): boolean {
  return (
    kind === 'subscribe' || kind === 'change' || kind === 'downgrade_free' || kind === 'fix_payment'
  );
}

/**
 * Clave del botón que dispara cada CTA (la misma que usa
 * `usePlanBillingActions` para marcar el botón pendiente), o `null` si
 * la CTA no lleva a Stripe.
 */
export function ctaActionKey(kind: PlanCtaKind, tier: PlanTierId): string | null {
  switch (kind) {
    case 'subscribe':
      return `checkout:${tier}`;
    case 'change':
      return `portal:change:${tier}`;
    case 'downgrade_free':
      return 'portal:cancel:';
    case 'fix_payment':
      return 'portal:payment_method:';
    default:
      return null;
  }
}
