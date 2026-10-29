/**
 * Constructores de objetos de Stripe para los tests de `billing`. Solo
 * rellenan los campos que lee el módulo; el cast a los tipos del SDK es
 * deliberado (el tipo completo tiene decenas de campos irrelevantes).
 */
import type Stripe from 'stripe';

export const CUSTOMER_ID = 'cus_aura';
export const PROVIDER_ID = 'prov-aura';

/** Price del catálogo con su lookup key, como lo crea `stripe:sync-plans`. */
export function buildPrice(tier: string, cents = 1900, overrides: Partial<Stripe.Price> = {}) {
  return {
    id: `price_${tier}`,
    object: 'price',
    lookup_key: `yaiwell_${tier}_monthly_eur`,
    metadata: { tier },
    unit_amount: cents,
    currency: 'eur',
    recurring: { interval: 'month', interval_count: 1 },
    tax_behavior: 'inclusive',
    ...overrides,
  } as unknown as Stripe.Price;
}

interface SubscriptionOptions {
  id?: string;
  status?: Stripe.Subscription.Status;
  tier?: string;
  periodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  schedule?: unknown;
  customer?: string;
}

/** Suscripción (API dahlia: el periodo vive en el item). */
export function buildSubscription(options: SubscriptionOptions = {}): Stripe.Subscription {
  return {
    id: options.id ?? 'sub_1',
    object: 'subscription',
    customer: options.customer ?? CUSTOMER_ID,
    status: options.status ?? 'active',
    cancel_at_period_end: options.cancelAtPeriodEnd ?? false,
    cancel_at: options.cancelAt ?? null,
    schedule: options.schedule ?? null,
    metadata: { providerId: PROVIDER_ID },
    items: {
      data: [
        {
          id: 'si_1',
          price: buildPrice(options.tier ?? 'pro', 4900),
          current_period_end: options.periodEnd ?? 1_800_000_000,
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

/** Schedule con la fase actual y una siguiente (bajada a fin de periodo). */
export function buildSchedule(nextPrice: unknown, currentEnd = 1_800_000_000) {
  return {
    id: 'sub_sched_1',
    status: 'active',
    current_phase: { start_date: 1_797_000_000, end_date: currentEnd },
    phases: [
      { start_date: 1_797_000_000, end_date: currentEnd, items: [{ price: 'price_pro' }] },
      { start_date: currentEnd, end_date: currentEnd + 2_600_000, items: [{ price: nextPrice }] },
    ],
  };
}

/** Fila de `provider_billing` con valores por defecto. */
export function buildBillingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pb-1',
    providerId: PROVIDER_ID,
    stripeCustomerId: CUSTOMER_ID,
    stripeSubscriptionId: null as string | null,
    subscriptionStatus: null as string | null,
    subscribedPlanId: null as string | null,
    currentPeriodEnd: null as Date | null,
    cancelAtPeriodEnd: false,
    scheduledPlanId: null as string | null,
    scheduledChangeAt: null as Date | null,
    lastPaymentFailedAt: null as Date | null,
    lastFailureNotifiedKey: null as string | null,
    lastSyncedAt: null as Date | null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  };
}

/** Planes sembrados (cifras de CLAUDE.md §4.bis). */
export const PLANS = {
  free: {
    id: 'plan-free',
    tier: 'free',
    maxServices: 1,
    monthlyPriceCents: 0,
    commissionRateBps: 1200,
  },
  basic: {
    id: 'plan-basic',
    tier: 'basic',
    maxServices: 10,
    monthlyPriceCents: 1900,
    commissionRateBps: 1000,
  },
  pro: {
    id: 'plan-pro',
    tier: 'pro',
    maxServices: 50,
    monthlyPriceCents: 4900,
    commissionRateBps: 800,
  },
  premium: {
    id: 'plan-premium',
    tier: 'premium',
    maxServices: 100000,
    monthlyPriceCents: 9900,
    commissionRateBps: 600,
  },
} as const;

/** Busca un plan por tier o por id (para los mocks del repository). */
export function planBy(key: string) {
  return Object.values(PLANS).find((plan) => plan.tier === key || plan.id === key) ?? null;
}
