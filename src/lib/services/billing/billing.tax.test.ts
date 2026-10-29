/**
 * Tests de `resolveVatTaxRate`: localiza el IVA por metadata, comprueba
 * sus valores, cachea y falla con error tipado si no está configurado.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({ taxRates: { list: vi.fn() } }));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));

import { BillingStripeError, VatTaxRateNotConfiguredError } from './billing.errors';
import { __resetVatTaxRateCacheForTests, resolveVatTaxRate } from './billing.tax';

function rate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'txr_iva21',
    active: true,
    percentage: 21,
    inclusive: true,
    country: 'ES',
    metadata: { yaiwell: 'vat_es_21_inclusive' },
    ...overrides,
  };
}

/** `list()` del SDK devuelve un objeto paginable con `autoPagingToArray`. */
function stripeReturns(rates: unknown[]) {
  stripeMock.taxRates.list.mockReturnValue({ autoPagingToArray: async () => rates });
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetVatTaxRateCacheForTests();
});

describe('resolveVatTaxRate', () => {
  it('devuelve el rate marcado entre los activos', async () => {
    stripeReturns([rate({ id: 'txr_otro', metadata: {} }), rate()]);
    await expect(resolveVatTaxRate()).resolves.toBe('txr_iva21');
    expect(stripeMock.taxRates.list).toHaveBeenCalledWith({ active: true, limit: 100 });
  });

  it('cachea el id', async () => {
    stripeReturns([rate()]);
    await resolveVatTaxRate();
    await resolveVatTaxRate();
    expect(stripeMock.taxRates.list).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no existe', []],
    ['es de otro porcentaje', [rate({ percentage: 10 })]],
    ['no es inclusivo', [rate({ inclusive: false })]],
    ['es de otro país', [rate({ country: 'PT' })]],
  ])('VatTaxRateNotConfiguredError si el rate %s', async (_label, rates) => {
    stripeReturns(rates);
    await expect(resolveVatTaxRate()).rejects.toBeInstanceOf(VatTaxRateNotConfiguredError);
  });

  it('BillingStripeError si Stripe falla', async () => {
    stripeMock.taxRates.list.mockReturnValue({
      autoPagingToArray: async () => {
        throw new Error('network');
      },
    });
    await expect(resolveVatTaxRate()).rejects.toBeInstanceOf(BillingStripeError);
  });
});
