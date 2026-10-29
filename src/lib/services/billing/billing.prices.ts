import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';
import type { PlanTierId } from '@/lib/services/plans';

import { PLAN_CURRENCY, planPriceLookupKey, tierFromLookupKey } from './billing.catalog';
import {
  BillingPlanNotSeededError,
  BillingStripeError,
  PlanPriceMismatchError,
} from './billing.errors';
import { billingRepository } from './billing.repository';
import type { PaidPlanTier } from './billing.types';
import { planTierSchema, priceMetadataSchema } from './billing.validation';

/**
 * Caché corta de los prices de Stripe por tier. Los importes cambian
 * como mucho un par de veces al año y cada Checkout ahorra así una
 * llamada; 5 minutos bastan para que un `stripe:sync-plans` se note
 * enseguida sin redeploy.
 */
const PRICE_CACHE_TTL_MS = 5 * 60_000;
const priceCache = new Map<PaidPlanTier, { price: Stripe.Price; expiresAt: number }>();

/**
 * Devuelve el price mensual vigente de un tier y comprueba que cobra
 * exactamente lo que dice la tabla `plans` (fuente de verdad de lo que
 * publicamos), en euros, mensual y con IVA incluido.
 *
 * @throws BillingPlanNotSeededError — si el tier no está en `plans`.
 * @throws PlanPriceMismatchError — si no hay price o no cuadra con `plans`.
 * @throws BillingStripeError — si Stripe no responde.
 */
export async function resolvePriceForTier(tier: PaidPlanTier): Promise<Stripe.Price> {
  const plan = await billingRepository.findPlanByTier(tier);
  if (!plan) throw new BillingPlanNotSeededError(tier);

  const price = await loadPrice(tier);
  // Comparamos siempre contra BD (aunque el price venga de caché): un
  // cambio de tarifa en `plans` sin sincronizar Stripe se detecta al
  // momento y no se vende a un importe distinto del publicado.
  const matches =
    price.unit_amount === plan.monthlyPriceCents &&
    price.currency === PLAN_CURRENCY &&
    price.recurring?.interval === 'month' &&
    price.recurring.interval_count === 1 &&
    price.tax_behavior === 'inclusive';
  if (!matches) throw new PlanPriceMismatchError(tier);
  return price;
}

async function loadPrice(tier: PaidPlanTier): Promise<Stripe.Price> {
  const cached = priceCache.get(tier);
  if (cached && cached.expiresAt > Date.now()) return cached.price;

  let prices: Stripe.ApiList<Stripe.Price>;
  try {
    prices = await getStripeClient().prices.list({
      lookup_keys: [planPriceLookupKey(tier)],
      active: true,
      limit: 1,
    });
  } catch (err) {
    throw new BillingStripeError('Could not list the plan price.', err);
  }
  const price = prices.data[0];
  if (!price) throw new PlanPriceMismatchError(tier);
  priceCache.set(tier, { price, expiresAt: Date.now() + PRICE_CACHE_TTL_MS });
  return price;
}

/**
 * Tier al que corresponde un price de una suscripción. Primero por
 * lookup key (la vigente) y, si ya se transfirió a un price nuevo, por
 * `metadata.tier` (que el script pone en todos). Validado con Zod: un
 * price ajeno al catálogo devuelve `null` en vez de colarse como plan.
 *
 * @param price — price expandido; un id sin expandir devuelve `null`.
 */
export function tierFromPrice(
  price: Stripe.Price | Stripe.DeletedPrice | string | null | undefined,
): PlanTierId | null {
  if (!price || typeof price === 'string' || price.deleted) return null;
  const byKey = planTierSchema.safeParse(tierFromLookupKey(price.lookup_key));
  if (byKey.success) return byKey.data;
  const byMetadata = priceMetadataSchema.safeParse(price.metadata);
  return byMetadata.success ? byMetadata.data.tier : null;
}

/** Vacía la caché de prices (solo tests). */
export function __resetPriceCacheForTests(): void {
  priceCache.clear();
}
