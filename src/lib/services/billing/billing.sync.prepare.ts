import 'server-only';

import type { ProviderBilling } from '@prisma/client';
import type Stripe from 'stripe';

import type { PlanTierId } from '@/lib/services/plans';

import { BillingPlanNotSeededError, PlanPriceMismatchError } from './billing.errors';
import { tierFromPrice } from './billing.prices';
import { reportBillingIssue } from './billing.report';
import { billingRepository, type SubscriptionMirror } from './billing.repository';
import {
  isDeadStatus,
  nextPhaseOf,
  periodEndOf,
  primaryItem,
  scheduledChangeFrom,
  targetTierFor,
  toSubscriptionStatus,
  willCancel,
} from './billing.sync.mapping';
import { loadPhasePrice } from './billing.sync.stripe';

/** Plan al que debe quedar el negocio (con su límite de servicios). */
export interface SyncTarget {
  id: string;
  tier: PlanTierId;
  maxServices: number;
}

/** Lo que la sincronización escribirá, calculado antes de bloquear. */
export interface PreparedWrite {
  mirror: SubscriptionMirror;
  /** `null` = el plan efectivo no se toca (`incomplete`, price ajeno). */
  target: SyncTarget | null;
}

/**
 * Calcula el espejo y el plan objetivo de una suscripción. Hace todas
 * las lecturas (Stripe y tabla `plans`) FUERA de la transacción, para no
 * mantener bloqueada la fila del negocio mientras se espera a la red.
 *
 * @throws BillingPlanNotSeededError — si falta un tier en `plans`.
 * @throws BillingStripeError — si no se puede leer el price programado.
 */
export async function prepareSubscriptionWrite(
  sub: Stripe.Subscription,
  providerId: string,
): Promise<PreparedWrite> {
  const price = primaryItem(sub)?.price ?? null;
  const priceTier = tierFromPrice(price);
  if (!priceTier) {
    reportBillingIssue(new PlanPriceMismatchError(price?.id ?? 'unknown'), providerId, {
      subscriptionId: sub.id,
    });
  }

  const next = nextPhaseOf(sub);
  const scheduled = next
    ? scheduledChangeFrom(sub, await loadPhasePrice(next.price), next.at)
    : null;

  const mirror: SubscriptionMirror = {
    stripeSubscriptionId: sub.id,
    subscriptionStatus: toSubscriptionStatus(sub.status),
    subscribedPlanId: priceTier && !isDeadStatus(sub.status) ? (await planFor(priceTier)).id : null,
    currentPeriodEnd: periodEndOf(sub),
    cancelAtPeriodEnd: willCancel(sub),
    scheduledPlanId: scheduled ? (await planFor(scheduled.tier)).id : null,
    scheduledChangeAt: scheduled?.at ?? null,
  };
  const targetTier = targetTierFor(sub.status, priceTier);
  return { mirror, target: targetTier ? await planFor(targetTier) : null };
}

async function planFor(tier: PlanTierId): Promise<SyncTarget> {
  const plan = await billingRepository.findPlanByTier(tier);
  if (!plan) throw new BillingPlanNotSeededError(tier);
  return { id: plan.id, tier: plan.tier, maxServices: plan.maxServices };
}

/** ¿El espejo nuevo difiere del guardado? Solo informativo (`changed`). */
export function mirrorDiffers(row: ProviderBilling, next: SubscriptionMirror): boolean {
  const sameDate = (a: Date | null, b: Date | null) =>
    (a?.getTime() ?? null) === (b?.getTime() ?? null);
  return (
    row.stripeSubscriptionId !== next.stripeSubscriptionId ||
    row.subscriptionStatus !== next.subscriptionStatus ||
    row.subscribedPlanId !== next.subscribedPlanId ||
    row.cancelAtPeriodEnd !== next.cancelAtPeriodEnd ||
    row.scheduledPlanId !== next.scheduledPlanId ||
    !sameDate(row.currentPeriodEnd, next.currentPeriodEnd) ||
    !sameDate(row.scheduledChangeAt, next.scheduledChangeAt)
  );
}
