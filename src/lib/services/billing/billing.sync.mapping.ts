import type Stripe from 'stripe';

import type { PlanTierId } from '@/lib/services/plans';

import { tierFromPrice } from './billing.prices';
import {
  DEAD_SUBSCRIPTION_STATUSES,
  LIVE_SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from './billing.types';

/**
 * Traducciones puras de una `Stripe.Subscription` (API 2026-05-27.dahlia)
 * a nuestro modelo. Sin BD ni red: se prueban sin mocks.
 */

/** La suscripción da derecho al plan pagado (`active|past_due`). */
export function isLiveStatus(status: string): boolean {
  return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

/** La suscripción ha terminado o está suspendida: el negocio va a Gratis. */
export function isDeadStatus(status: string): boolean {
  return (DEAD_SUBSCRIPTION_STATUSES as readonly string[]).includes(status);
}

/**
 * Estado de Stripe → enum de BD. Son los mismos ocho valores; si Stripe
 * añade uno nuevo, TypeScript lo marcará aquí al subir la versión.
 */
export function toSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  return status;
}

/**
 * Plan efectivo que corresponde a la suscripción:
 *  - viva → el tier de su price (`null` si el price no es del catálogo:
 *    no tocamos el plan y se reporta);
 *  - terminada o suspendida → Gratis (CLAUDE.md §4.bis: impago → Gratis
 *    tras los reintentos de Stripe);
 *  - `incomplete` (primer pago pendiente de 3DS) o `trialing` (no
 *    vendemos pruebas) → `null`, sin cambios.
 */
export function targetTierFor(
  status: Stripe.Subscription.Status,
  priceTier: PlanTierId | null,
): PlanTierId | null {
  if (isLiveStatus(status)) return priceTier;
  if (isDeadStatus(status)) return 'free';
  return null;
}

/** Primer (y único) item de la suscripción: un plan por suscripción. */
export function primaryItem(sub: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return sub.items.data[0] ?? null;
}

/**
 * Fin del periodo en curso. Desde la API `basil` vive en cada item, no en
 * la suscripción.
 */
export function periodEndOf(sub: Stripe.Subscription): Date | null {
  const end = primaryItem(sub)?.current_period_end;
  return typeof end === 'number' ? new Date(end * 1000) : null;
}

/** Id del Customer, venga expandido o no. */
export function customerIdOf(sub: Stripe.Subscription): string {
  return typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
}

/**
 * Se cancelará al final del periodo. El portal puede expresarlo con
 * `cancel_at_period_end` o con una fecha `cancel_at`.
 */
export function willCancel(sub: Stripe.Subscription): boolean {
  return sub.cancel_at_period_end || (sub.cancel_at !== null && isLiveStatus(sub.status));
}

/** Price de la siguiente fase de un schedule (sin expandir o expandido). */
export type PhasePriceRef = Stripe.Price | Stripe.DeletedPrice | string;

/**
 * Siguiente fase del schedule (bajada a fin de periodo desde el portal):
 * la que empieza cuando acaba la actual. Solo la localiza; el tier lo
 * resuelve el caller, que puede necesitar leer el price en Stripe.
 *
 * @returns price y fecha de inicio de la fase siguiente, o `null`.
 */
export function nextPhaseOf(sub: Stripe.Subscription): { price: PhasePriceRef; at: Date } | null {
  const schedule = sub.schedule;
  if (!schedule || typeof schedule === 'string') return null;
  if (schedule.status !== 'active' && schedule.status !== 'not_started') return null;
  const currentEnd = schedule.current_phase?.end_date;
  if (currentEnd === undefined) return null;
  const next = schedule.phases.find((phase) => phase.start_date >= currentEnd);
  const price = next?.items[0]?.price;
  if (!next || !price) return null;
  return { price, at: new Date(next.start_date * 1000) };
}

/**
 * Cambio programado efectivo: la fase siguiente apunta a otro tier del
 * catálogo. Una fase con el mismo tier (renovación) no es un cambio.
 */
export function scheduledChangeFrom(
  sub: Stripe.Subscription,
  nextPrice: Stripe.Price | Stripe.DeletedPrice | null,
  at: Date,
): { tier: PlanTierId; at: Date } | null {
  const tier = tierFromPrice(nextPrice);
  if (!tier || tier === tierFromPrice(primaryItem(sub)?.price)) return null;
  return { tier, at };
}
