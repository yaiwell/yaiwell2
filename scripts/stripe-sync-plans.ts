/**
 * Sincroniza el catálogo de planes de pago en Stripe Billing con la tabla
 * `plans` (fuente de verdad de las cuotas que publicamos).
 *
 * Para cada tier de pago (basic, pro, premium):
 *  1. Product con id fijo `yaiwell_plan_{tier}` (lo crea si no existe).
 *  2. Price mensual en EUR, IVA incluido (`tax_behavior: inclusive`), con
 *     lookup key `yaiwell_{tier}_monthly_eur` y `metadata.tier`.
 *  3. Si el importe de `plans` cambió, crea un price nuevo que se queda
 *     la lookup key (`transfer_lookup_key`) y archiva el anterior. Las
 *     suscripciones existentes siguen con el price viejo hasta que se
 *     migren a mano: Stripe no cambia el precio de quien ya paga.
 *
 * Además asegura el Tax Rate del IVA (21 %, inclusivo, España) que el
 * Checkout pone en `subscription_data.default_tax_rates`. Stripe no deja
 * fijar su id: se localiza por `metadata.yaiwell`.
 *
 * Y crea o actualiza la configuración del Customer Portal de planes
 * (localizada por `metadata.yaiwell = plans_portal`) con los prices
 * vigentes: el service la pasa en cada sesión del portal.
 *
 * Solo LEE la BD (no escribe `plans.stripePriceId`: el service busca por
 * lookup key). Es idempotente: re-ejecutarlo sin cambios no toca nada.
 *
 * Ejecución:
 *   npm run stripe:sync-plans               # clave sk_test_/rk_test_
 *   npm run stripe:sync-plans -- --dry-run  # solo imprime lo que haría
 *   npm run stripe:sync-plans -- --live     # obligatorio con clave live
 */

/* eslint-disable no-console -- script de CLI: logs en stdout son la salida esperada. */

import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import type Stripe from 'stripe';

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// Imports tras cargar env: el cliente Stripe lee la clave al primer uso.
import { getStripeClient } from '../src/lib/integrations/stripe/stripe.client';
import {
  PAID_PLAN_TIERS,
  PLAN_CURRENCY,
  planPriceLookupKey,
  planProductId,
  buildPortalFeatures,
  PORTAL_CONFIG_METADATA,
  PORTAL_LEGAL_URLS,
  VAT_TAX_RATE,
  VAT_TAX_RATE_METADATA,
  type PortalPlanProduct,
} from '../src/lib/services/billing/billing.catalog';
import type { PaidPlanTier } from '../src/lib/services/billing/billing.types';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const LIVE = args.has('--live');

interface PlanRow {
  name: string;
  monthlyPriceCents: number;
}

/** Aborta si la clave es de producción y no se pidió `--live` explícito. */
function assertKeyMode(): void {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  const isTest = key.startsWith('sk_test_') || key.startsWith('rk_test_');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set (.env.local).');
  if (!isTest && !LIVE) {
    throw new Error('STRIPE_SECRET_KEY is not a test key. Re-run with --live to touch live mode.');
  }
  console.log(`Stripe mode: ${isTest ? 'TEST' : 'LIVE'}${DRY_RUN ? ' (dry run)' : ''}`);
}

function isMissing(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'resource_missing'
  );
}

async function ensureProduct(stripe: Stripe, tier: PaidPlanTier, plan: PlanRow): Promise<string> {
  const id = planProductId(tier);
  const name = `Yaiwell ${plan.name}`;
  try {
    const product = await stripe.products.retrieve(id);
    if (product.name !== name || !product.active) {
      console.log(`  product ${id}: update name="${name}" active=true`);
      if (!DRY_RUN) await stripe.products.update(id, { name, active: true });
    } else {
      console.log(`  product ${id}: ok`);
    }
  } catch (err) {
    if (!isMissing(err)) throw err;
    console.log(`  product ${id}: create "${name}"`);
    if (!DRY_RUN) await stripe.products.create({ id, name, metadata: { tier } });
  }
  return id;
}

function priceMatches(price: Stripe.Price, cents: number): boolean {
  return (
    price.unit_amount === cents &&
    price.currency === PLAN_CURRENCY &&
    price.recurring?.interval === 'month' &&
    price.recurring.interval_count === 1 &&
    price.tax_behavior === 'inclusive'
  );
}

/** @returns id del price vigente, o `null` en dry run si habría que crearlo. */
async function ensurePrice(
  stripe: Stripe,
  tier: PaidPlanTier,
  productId: string,
  cents: number,
): Promise<string | null> {
  const lookupKey = planPriceLookupKey(tier);
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const current = data[0];
  if (current && priceMatches(current, cents)) {
    console.log(`  price ${lookupKey}: ok (${current.id}, ${cents} cents)`);
    return current.id;
  }
  const reason = current ? `replace ${current.id} (${current.unit_amount} → ${cents})` : 'create';
  console.log(`  price ${lookupKey}: ${reason}`);
  if (DRY_RUN) return null;
  const created = await stripe.prices.create({
    product: productId,
    currency: PLAN_CURRENCY,
    unit_amount: cents,
    recurring: { interval: 'month' },
    tax_behavior: 'inclusive',
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { tier },
  });
  console.log(`    created ${created.id}`);
  if (current) {
    await stripe.prices.update(current.id, { active: false });
    console.log(`    archived ${current.id}`);
  }
  return created.id;
}

/**
 * Configuración del Customer Portal de planes: la busca por metadata y
 * la crea o la actualiza (los mismos parámetros dejan la misma
 * configuración: idempotente). Necesita los prices vigentes.
 */
async function ensurePortalConfiguration(
  stripe: Stripe,
  products: PortalPlanProduct[],
): Promise<void> {
  const configs = await stripe.billingPortal.configurations
    .list({ limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  const ours = configs.find(
    (config) => config.metadata?.yaiwell === PORTAL_CONFIG_METADATA.yaiwell,
  );
  const params = {
    business_profile: { ...PORTAL_LEGAL_URLS },
    features: buildPortalFeatures(products),
    metadata: { ...PORTAL_CONFIG_METADATA },
  };
  if (ours) {
    console.log(`portal configuration: update ${ours.id}${ours.active ? '' : ' (reactivate)'}`);
    if (!DRY_RUN)
      await stripe.billingPortal.configurations.update(ours.id, { ...params, active: true });
    return;
  }
  console.log('portal configuration: create');
  if (DRY_RUN) return;
  const created = await stripe.billingPortal.configurations.create(params);
  console.log(`  created ${created.id}`);
}

/**
 * Tax Rate del IVA: lo busca por metadata entre los activos y lo crea si
 * no existe. Uno con nuestra marca pero valores distintos no se toca (los
 * rates son inmutables): se avisa y se aborta para revisarlo a mano.
 */
async function ensureVatTaxRate(stripe: Stripe): Promise<void> {
  const rates = await stripe.taxRates
    .list({ active: true, limit: 100 })
    .autoPagingToArray({ limit: 1000 });
  const ours = rates.filter((rate) => rate.metadata?.yaiwell === VAT_TAX_RATE_METADATA.yaiwell);
  const valid = ours.find(
    (rate) =>
      rate.percentage === VAT_TAX_RATE.percentage &&
      rate.inclusive === VAT_TAX_RATE.inclusive &&
      rate.country === VAT_TAX_RATE.country,
  );
  if (valid) {
    console.log(`tax rate IVA: ok (${valid.id})`);
    return;
  }
  if (ours.length > 0) {
    throw new Error(
      `Tax rate ${ours.map((rate) => rate.id).join(', ')} has our metadata but wrong values: ` +
        'archive it in the Dashboard and re-run.',
    );
  }
  console.log('tax rate IVA: create 21% inclusive ES');
  if (DRY_RUN) return;
  const created = await stripe.taxRates.create({
    ...VAT_TAX_RATE,
    metadata: { ...VAT_TAX_RATE_METADATA },
  });
  console.log(`  created ${created.id}`);
}

async function main(): Promise<void> {
  assertKeyMode();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set (.env.local).');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const stripe = getStripeClient();
  try {
    await ensureVatTaxRate(stripe);
    const products: PortalPlanProduct[] = [];
    for (const tier of PAID_PLAN_TIERS) {
      const plan = await prisma.plan.findUnique({
        where: { tier },
        select: { name: true, monthlyPriceCents: true },
      });
      if (!plan) throw new Error(`Plan "${tier}" not found in table plans (run the seed).`);
      if (plan.monthlyPriceCents <= 0) throw new Error(`Plan "${tier}" has no monthly price.`);
      console.log(`${tier}: ${plan.monthlyPriceCents} cents/month`);
      const productId = await ensureProduct(stripe, tier, plan);
      const priceId = await ensurePrice(stripe, tier, productId, plan.monthlyPriceCents);
      if (priceId) products.push({ product: productId, prices: [priceId] });
    }
    if (products.length === PAID_PLAN_TIERS.length) {
      await ensurePortalConfiguration(stripe, products);
    } else {
      // Solo en dry run: los prices nuevos aún no existen.
      console.log('portal configuration: skipped (prices pending creation)');
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log('Done.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
