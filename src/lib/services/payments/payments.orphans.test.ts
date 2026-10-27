/**
 * Tests de la limpieza de cuentas huérfanas en `ensureConnectAccount`:
 * carrera de doble clic (gana / pierde / borrado fallido) y fallo de BD
 * tras crear la cuenta. Solo se borra el id creado en la misma petición.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  accounts: { create: vi.fn(), retrieve: vi.fn(), del: vi.fn() },
  accountLinks: { create: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => stripeMock,
}));

const repoMock = vi.hoisted(() => ({
  findProviderForPayments: vi.fn(),
  setStripeAccountIdIfEmpty: vi.fn(),
}));

vi.mock('./payments.repository', () => ({
  paymentsRepository: repoMock,
}));

vi.mock('@/lib/integrations/sentry', () => ({ isSentryEnabled: () => false }));

import { ensureConnectAccount } from './payments.service';

const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';

function providerWithAccount(stripeAccountId: string | null) {
  return { id: PROVIDER_ID, stripeAccountId, ownerEmail: 'aura@example.com' };
}

beforeEach(() => {
  vi.clearAllMocks();
  repoMock.setStripeAccountIdIfEmpty.mockResolvedValue(true);
});

describe('ensureConnectAccount — carrera de doble clic', () => {
  it('gana la carrera: guarda su cuenta y no borra nada', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(null));
    stripeMock.accounts.create.mockResolvedValue({ id: 'acct_mine' });
    repoMock.setStripeAccountIdIfEmpty.mockResolvedValue(true);

    const result = await ensureConnectAccount(PROVIDER_ID, 'individual');

    expect(result).toBe('acct_mine');
    expect(stripeMock.accounts.del).not.toHaveBeenCalled();
  });

  it('pierde la carrera: devuelve la cuenta ganadora y borra solo la suya', async () => {
    repoMock.findProviderForPayments
      .mockResolvedValueOnce(providerWithAccount(null))
      .mockResolvedValueOnce(providerWithAccount('acct_winner'));
    stripeMock.accounts.create.mockResolvedValue({ id: 'acct_mine' });
    repoMock.setStripeAccountIdIfEmpty.mockResolvedValue(false);
    stripeMock.accounts.del.mockResolvedValue({ id: 'acct_mine', deleted: true });

    const result = await ensureConnectAccount(PROVIDER_ID, 'company');

    expect(result).toBe('acct_winner');
    expect(stripeMock.accounts.del).toHaveBeenCalledTimes(1);
    expect(stripeMock.accounts.del).toHaveBeenCalledWith('acct_mine');
  });

  it('pierde la carrera y el borrado falla: lo registra sin lanzar', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    repoMock.findProviderForPayments
      .mockResolvedValueOnce(providerWithAccount(null))
      .mockResolvedValueOnce(providerWithAccount('acct_winner'));
    stripeMock.accounts.create.mockResolvedValue({ id: 'acct_mine' });
    repoMock.setStripeAccountIdIfEmpty.mockResolvedValue(false);
    stripeMock.accounts.del.mockRejectedValue(new Error('stripe down'));

    const result = await ensureConnectAccount(PROVIDER_ID, 'company');

    expect(result).toBe('acct_winner');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[payments] orphan Stripe account not deleted:',
      'acct_mine',
      PROVIDER_ID,
    );
    consoleSpy.mockRestore();
  });
});

describe('ensureConnectAccount — fallo al guardar', () => {
  it('borra la cuenta recién creada y relanza el error original', async () => {
    const dbError = new Error('db down');
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(null));
    stripeMock.accounts.create.mockResolvedValue({ id: 'acct_mine' });
    repoMock.setStripeAccountIdIfEmpty.mockRejectedValue(dbError);
    stripeMock.accounts.del.mockResolvedValue({ id: 'acct_mine', deleted: true });

    await expect(ensureConnectAccount(PROVIDER_ID, 'individual')).rejects.toBe(dbError);
    expect(stripeMock.accounts.del).toHaveBeenCalledTimes(1);
    expect(stripeMock.accounts.del).toHaveBeenCalledWith('acct_mine');
  });
});
