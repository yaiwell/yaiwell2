import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { VAT_TAX_RATE, VAT_TAX_RATE_METADATA } from './billing.catalog';
import { BillingStripeError, VatTaxRateNotConfiguredError } from './billing.errors';

/**
 * Caché del Tax Rate del IVA. Es inmutable en Stripe (no se edita el
 * porcentaje, se crea otro), así que puede vivir lo que viva la instancia;
 * la caducidad corta solo sirve para notar a tiempo un rate archivado.
 */
const TAX_RATE_CACHE_TTL_MS = 10 * 60_000;
let cached: { id: string; expiresAt: number } | null = null;

/**
 * Id del Tax Rate del IVA español (21 %, inclusivo) que va en
 * `subscription_data.default_tax_rates`. Con precios `inclusive` el total
 * no cambia: la factura desglosa la base y el IVA (decisión 2026-10-29:
 * Tax Rate fijo, sin Stripe Tax).
 *
 * Se localiza por `metadata.yaiwell` y se comprueba que sigue siendo 21 %
 * inclusivo de España; si no, no vendemos con un impuesto equivocado.
 *
 * @throws VatTaxRateNotConfiguredError — si no existe o no cuadra
 *   (se arregla con `npm run stripe:sync-plans`).
 * @throws BillingStripeError — si Stripe no responde.
 */
export async function resolveVatTaxRate(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  let rates: Stripe.TaxRate[];
  try {
    // `autoPagingToArray`: hay pocos rates, pero no damos por hecho que
    // el nuestro esté en la primera página.
    rates = await getStripeClient()
      .taxRates.list({ active: true, limit: 100 })
      .autoPagingToArray({ limit: 1000 });
  } catch (err) {
    throw new BillingStripeError('Could not list tax rates.', err);
  }
  const rate = rates.find((candidate) => isOurVatRate(candidate));
  if (!rate) throw new VatTaxRateNotConfiguredError();
  cached = { id: rate.id, expiresAt: Date.now() + TAX_RATE_CACHE_TTL_MS };
  return rate.id;
}

/** El rate lleva nuestra marca y los valores esperados. */
export function isOurVatRate(rate: Stripe.TaxRate): boolean {
  return (
    rate.metadata?.yaiwell === VAT_TAX_RATE_METADATA.yaiwell &&
    rate.active &&
    rate.percentage === VAT_TAX_RATE.percentage &&
    rate.inclusive === VAT_TAX_RATE.inclusive &&
    rate.country === VAT_TAX_RATE.country
  );
}

/** Vacía la caché (solo tests). */
export function __resetVatTaxRateCacheForTests(): void {
  cached = null;
}
