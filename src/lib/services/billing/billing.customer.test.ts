/**
 * Tests de `ensureBillingCustomer`: idempotencia, datos del Customer y
 * la carrera de doble clic (mismo Customer por clave vs. huérfano).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  customers: { create: vi.fn(), del: vi.fn() },
}));
vi.mock('@/lib/integrations/stripe', () => ({ getStripeClient: () => stripeMock }));
vi.mock('@/lib/integrations/sentry', () => ({ isSentryEnabled: () => false }));

const repoMock = vi.hoisted(() => ({
  findByProviderId: vi.fn(),
  findProviderForBilling: vi.fn(),
  insertIfAbsent: vi.fn(),
}));
vi.mock('./billing.repository', () => ({ billingRepository: repoMock }));

import { ensureBillingCustomer } from './billing.customer';
import { BillingProviderNotFoundError, BillingStripeError } from './billing.errors';
import { buildBillingRow, PROVIDER_ID } from './billing.test-fixtures';

const PROVIDER = {
  id: PROVIDER_ID,
  businessName: 'Studio Aura',
  ownerEmail: 'aura@yaiwell.com',
  ownerLocale: 'ca',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  repoMock.findProviderForBilling.mockResolvedValue(PROVIDER);
  stripeMock.customers.create.mockResolvedValue({ id: 'cus_new' });
  repoMock.insertIfAbsent.mockResolvedValue(true);
});

describe('ensureBillingCustomer', () => {
  it('devuelve el Customer guardado sin llamar a Stripe', async () => {
    repoMock.findByProviderId.mockResolvedValue(buildBillingRow({ stripeCustomerId: 'cus_old' }));
    await expect(ensureBillingCustomer(PROVIDER_ID)).resolves.toBe('cus_old');
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it('crea el Customer con los datos del dueño y clave de idempotencia', async () => {
    repoMock.findByProviderId.mockResolvedValue(null);
    await expect(ensureBillingCustomer(PROVIDER_ID)).resolves.toBe('cus_new');
    expect(stripeMock.customers.create).toHaveBeenCalledWith(
      {
        email: 'aura@yaiwell.com',
        name: 'Studio Aura',
        // Stripe no tiene catalán: castellano.
        preferred_locales: ['es'],
        metadata: { providerId: PROVIDER_ID },
      },
      { idempotencyKey: `billing-customer:${PROVIDER_ID}` },
    );
    expect(repoMock.insertIfAbsent).toHaveBeenCalledWith(PROVIDER_ID, 'cus_new');
  });

  it('lanza BillingProviderNotFoundError si el negocio no existe', async () => {
    repoMock.findByProviderId.mockResolvedValue(null);
    repoMock.findProviderForBilling.mockResolvedValue(null);
    await expect(ensureBillingCustomer(PROVIDER_ID)).rejects.toBeInstanceOf(
      BillingProviderNotFoundError,
    );
  });

  it('envuelve el fallo de Stripe en BillingStripeError', async () => {
    repoMock.findByProviderId.mockResolvedValue(null);
    stripeMock.customers.create.mockRejectedValue(new Error('network'));
    await expect(ensureBillingCustomer(PROVIDER_ID)).rejects.toBeInstanceOf(BillingStripeError);
  });

  it('si pierde la carrera con el mismo Customer (misma clave) no borra nada', async () => {
    repoMock.findByProviderId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildBillingRow({ stripeCustomerId: 'cus_new' }));
    repoMock.insertIfAbsent.mockResolvedValue(false);
    await expect(ensureBillingCustomer(PROVIDER_ID)).resolves.toBe('cus_new');
    expect(stripeMock.customers.del).not.toHaveBeenCalled();
  });

  it('si gana otro Customer distinto, borra solo el nuestro', async () => {
    repoMock.findByProviderId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildBillingRow({ stripeCustomerId: 'cus_winner' }));
    repoMock.insertIfAbsent.mockResolvedValue(false);
    await expect(ensureBillingCustomer(PROVIDER_ID)).resolves.toBe('cus_winner');
    expect(stripeMock.customers.del).toHaveBeenCalledWith('cus_new');
    expect(stripeMock.customers.del).toHaveBeenCalledTimes(1);
  });

  it('un fallo borrando el huérfano no tumba el alta', async () => {
    repoMock.findByProviderId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildBillingRow({ stripeCustomerId: 'cus_winner' }));
    repoMock.insertIfAbsent.mockResolvedValue(false);
    stripeMock.customers.del.mockRejectedValue(new Error('boom'));
    await expect(ensureBillingCustomer(PROVIDER_ID)).resolves.toBe('cus_winner');
  });

  it('si el insert falla por BD no borra el Customer (el reintento lo enlaza)', async () => {
    repoMock.findByProviderId.mockResolvedValue(null);
    repoMock.insertIfAbsent.mockRejectedValue(new Error('db down'));
    await expect(ensureBillingCustomer(PROVIDER_ID)).rejects.toThrow('db down');
    expect(stripeMock.customers.del).not.toHaveBeenCalled();
  });
});
