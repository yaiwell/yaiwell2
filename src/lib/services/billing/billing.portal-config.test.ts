/**
 * Tests de la configuración del Customer Portal de planes: el resolver
 * de runtime y las funcionalidades que aplica `stripe:sync-plans`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({ billingPortal: { configurations: { list: vi.fn() } } }));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

import { buildPortalFeatures, PORTAL_LEGAL_URLS } from './billing.catalog';
import { BillingPortalNotConfiguredError, BillingStripeError } from './billing.errors';
import {
  __resetPortalConfigCacheForTests,
  resolvePortalConfiguration,
} from './billing.portal-config';

function stripeReturns(configs: unknown[]) {
  stripeMock.billingPortal.configurations.list.mockReturnValue({
    autoPagingToArray: async () => configs,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetPortalConfigCacheForTests();
});

describe('resolvePortalConfiguration', () => {
  it('devuelve la configuración activa con nuestra metadata y la cachea', async () => {
    stripeReturns([
      { id: 'bpc_default', active: true, metadata: {} },
      { id: 'bpc_plans', active: true, metadata: { yaiwell: 'plans_portal' } },
    ]);
    await expect(resolvePortalConfiguration()).resolves.toBe('bpc_plans');
    await resolvePortalConfiguration();
    expect(stripeMock.billingPortal.configurations.list).toHaveBeenCalledTimes(1);
    expect(stripeMock.billingPortal.configurations.list).toHaveBeenCalledWith({
      active: true,
      limit: 100,
    });
  });

  it('BillingPortalNotConfiguredError si no existe (no cae a la de por defecto)', async () => {
    stripeReturns([{ id: 'bpc_default', active: true, metadata: {} }]);
    await expect(resolvePortalConfiguration()).rejects.toBeInstanceOf(
      BillingPortalNotConfiguredError,
    );
  });

  it('BillingStripeError si Stripe falla', async () => {
    stripeMock.billingPortal.configurations.list.mockReturnValue({
      autoPagingToArray: async () => {
        throw new Error('network');
      },
    });
    await expect(resolvePortalConfiguration()).rejects.toBeInstanceOf(BillingStripeError);
  });
});

describe('buildPortalFeatures', () => {
  const products = [
    { product: 'yaiwell_plan_basic', prices: ['price_basic'] },
    { product: 'yaiwell_plan_pro', prices: ['price_pro'] },
    { product: 'yaiwell_plan_premium', prices: ['price_premium'] },
  ];

  it('subidas con factura al momento y bajadas a fin de periodo', () => {
    expect(buildPortalFeatures(products).subscription_update).toEqual({
      enabled: true,
      default_allowed_updates: ['price'],
      proration_behavior: 'always_invoice',
      products,
      schedule_at_period_end: { conditions: [{ type: 'decreasing_item_amount' }] },
    });
  });

  it('cancelación a fin de periodo, tarjeta, facturas y datos fiscales', () => {
    const features = buildPortalFeatures(products);
    expect(features.subscription_cancel).toMatchObject({ enabled: true, mode: 'at_period_end' });
    expect(features.payment_method_update).toEqual({ enabled: true });
    expect(features.invoice_history).toEqual({ enabled: true });
    expect(features.customer_update).toEqual({
      enabled: true,
      allowed_updates: ['name', 'address', 'tax_id'],
    });
  });

  it('enlaces legales de Yaiwell', () => {
    expect(PORTAL_LEGAL_URLS).toEqual({
      privacy_policy_url: 'https://www.yaiwell.app/es/privacidad',
      terms_of_service_url: 'https://www.yaiwell.app/es/terminos',
    });
  });
});
