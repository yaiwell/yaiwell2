import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { PORTAL_CONFIG_METADATA } from './billing.catalog';
import { BillingPortalNotConfiguredError, BillingStripeError } from './billing.errors';

/** La configuración solo cambia al ejecutar el script: caché corta. */
const PORTAL_CONFIG_CACHE_TTL_MS = 10 * 60_000;
let cached: { id: string; expiresAt: number } | null = null;

/**
 * Id de la configuración del Customer Portal de planes (`bpc_…`), creada
 * por `npm run stripe:sync-plans`. Se pasa siempre en
 * `billingPortal.sessions.create` para no depender de la configuración
 * por defecto del Dashboard (que alguien podría cambiar a mano).
 *
 * @throws BillingPortalNotConfiguredError — si no existe o está inactiva.
 * @throws BillingStripeError — si Stripe no responde.
 */
export async function resolvePortalConfiguration(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  let configurations: Stripe.BillingPortal.Configuration[];
  try {
    configurations = await getStripeClient()
      .billingPortal.configurations.list({ active: true, limit: 100 })
      .autoPagingToArray({ limit: 1000 });
  } catch (err) {
    throw new BillingStripeError('Could not list billing portal configurations.', err);
  }
  const ours = configurations.find(
    (config) => config.active && config.metadata?.yaiwell === PORTAL_CONFIG_METADATA.yaiwell,
  );
  if (!ours) throw new BillingPortalNotConfiguredError();
  cached = { id: ours.id, expiresAt: Date.now() + PORTAL_CONFIG_CACHE_TTL_MS };
  return ours.id;
}

/** Vacía la caché (solo tests). */
export function __resetPortalConfigCacheForTests(): void {
  cached = null;
}
