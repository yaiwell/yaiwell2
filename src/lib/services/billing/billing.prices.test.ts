/**
 * Tests de los prices del catálogo: búsqueda por lookup key, caché,
 * comprobación contra la tabla `plans` y tier de un price.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({ prices: { list: vi.fn() } }));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

const repoMock = vi.hoisted(() => ({ findPlanByTier: vi.fn() }));
vi.mock('./billing.repository', () => ({ billingRepository: repoMock }));

import {
  BillingPlanNotSeededError,
  BillingStripeError,
  PlanPriceMismatchError,
} from './billing.errors';
import { __resetPriceCacheForTests, resolvePriceForTier, tierFromPrice } from './billing.prices';
import { buildPrice, planBy } from './billing.test-fixtures';

beforeEach(() => {
  vi.clearAllMocks();
  __resetPriceCacheForTests();
  repoMock.findPlanByTier.mockImplementation(async (tier: string) => planBy(tier));
});

describe('resolvePriceForTier', () => {
  it('busca el price activo por lookup key y lo devuelve si cuadra con plans', async () => {
    stripeMock.prices.list.mockResolvedValue({ data: [buildPrice('basic', 1900)] });
    const price = await resolvePriceForTier('basic');
    expect(price.id).toBe('price_basic');
    expect(stripeMock.prices.list).toHaveBeenCalledWith({
      lookup_keys: ['yaiwell_basic_monthly_eur'],
      active: true,
      limit: 1,
    });
  });

  it('cachea el price pero vuelve a comparar con la BD', async () => {
    stripeMock.prices.list.mockResolvedValue({ data: [buildPrice('basic', 1900)] });
    await resolvePriceForTier('basic');
    await resolvePriceForTier('basic');
    expect(stripeMock.prices.list).toHaveBeenCalledTimes(1);
    expect(repoMock.findPlanByTier).toHaveBeenCalledTimes(2);

    // La tarifa cambia en BD sin sincronizar Stripe: no se vende.
    repoMock.findPlanByTier.mockResolvedValue({ ...planBy('basic'), monthlyPriceCents: 2100 });
    await expect(resolvePriceForTier('basic')).rejects.toBeInstanceOf(PlanPriceMismatchError);
  });

  it.each([
    ['importe distinto', { unit_amount: 1800 }],
    ['IVA no incluido', { tax_behavior: 'exclusive' }],
    ['otra moneda', { currency: 'usd' }],
  ])('rechaza el price con %s', async (_label, overrides) => {
    stripeMock.prices.list.mockResolvedValue({
      data: [buildPrice('basic', 1900, overrides as never)],
    });
    await expect(resolvePriceForTier('basic')).rejects.toBeInstanceOf(PlanPriceMismatchError);
  });

  it('PlanPriceMismatchError si no hay price con esa lookup key', async () => {
    stripeMock.prices.list.mockResolvedValue({ data: [] });
    await expect(resolvePriceForTier('pro')).rejects.toBeInstanceOf(PlanPriceMismatchError);
  });

  it('BillingPlanNotSeededError si el tier no está en plans', async () => {
    repoMock.findPlanByTier.mockResolvedValue(null);
    await expect(resolvePriceForTier('pro')).rejects.toBeInstanceOf(BillingPlanNotSeededError);
    expect(stripeMock.prices.list).not.toHaveBeenCalled();
  });

  it('BillingStripeError si Stripe falla', async () => {
    stripeMock.prices.list.mockRejectedValue(new Error('network'));
    await expect(resolvePriceForTier('pro')).rejects.toBeInstanceOf(BillingStripeError);
  });
});

describe('tierFromPrice', () => {
  it('lee el tier de la lookup key', () => {
    expect(tierFromPrice(buildPrice('premium'))).toBe('premium');
  });

  it('cae a metadata.tier si el price ya no tiene la lookup key', () => {
    expect(tierFromPrice(buildPrice('pro', 4900, { lookup_key: null }))).toBe('pro');
  });

  it('devuelve null para prices ajenos, ids sin expandir o tiers desconocidos', () => {
    expect(tierFromPrice('price_123')).toBeNull();
    expect(tierFromPrice(null)).toBeNull();
    expect(
      tierFromPrice(buildPrice('gold', 100, { lookup_key: 'yaiwell_gold_monthly_eur' })),
    ).toBeNull();
    expect(tierFromPrice(buildPrice('x', 100, { lookup_key: 'other', metadata: {} }))).toBeNull();
  });
});
