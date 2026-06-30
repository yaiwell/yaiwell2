/**
 * Tests del service `payments` (Stripe Connect).
 *
 * Mockeamos el repository (acceso BD) y el cliente Stripe completo
 * para validar en aislamiento que:
 *  - `ensureConnectAccount` es idempotente: si ya hay stripeAccountId
 *    lo devuelve sin crear cuenta nueva.
 *  - Crea cuenta Express con el email del owner cuando no había.
 *  - Lanza errores tipados ante fallos esperados.
 *  - `getConnectAccountStatus` interpreta correctamente los flags
 *    de habilitación y los requirements pendientes.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  accounts: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  accountLinks: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => stripeMock,
}));

const repoMock = vi.hoisted(() => ({
  findProviderForPayments: vi.fn(),
  setStripeAccountId: vi.fn(),
}));

vi.mock('./payments.repository', () => ({
  paymentsRepository: repoMock,
}));

import {
  ensureConnectAccount,
  getConnectAccountStatus,
  getProviderPaymentsStatus,
} from './payments.service';
import { ProviderForPaymentsNotFoundError, StripeOperationError } from './payments.errors';

const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const STRIPE_ACCOUNT_ID = 'acct_1Nxxxx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ensureConnectAccount', () => {
  it('devuelve el stripeAccountId existente sin crear cuenta nueva', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: STRIPE_ACCOUNT_ID,
      ownerEmail: 'aura@example.com',
    });

    const result = await ensureConnectAccount(PROVIDER_ID);

    expect(result).toBe(STRIPE_ACCOUNT_ID);
    expect(stripeMock.accounts.create).not.toHaveBeenCalled();
    expect(repoMock.setStripeAccountId).not.toHaveBeenCalled();
  });

  it('crea una cuenta Express y la persiste cuando no había', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: null,
      ownerEmail: 'aura@example.com',
    });
    stripeMock.accounts.create.mockResolvedValue({ id: 'acct_new123' });

    const result = await ensureConnectAccount(PROVIDER_ID);

    expect(result).toBe('acct_new123');
    expect(stripeMock.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        email: 'aura@example.com',
        country: 'ES',
        metadata: { providerId: PROVIDER_ID },
      }),
    );
    expect(repoMock.setStripeAccountId).toHaveBeenCalledWith(PROVIDER_ID, 'acct_new123');
  });

  it('lanza ProviderForPaymentsNotFoundError si el provider no existe', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(null);

    await expect(ensureConnectAccount(PROVIDER_ID)).rejects.toBeInstanceOf(
      ProviderForPaymentsNotFoundError,
    );
    expect(stripeMock.accounts.create).not.toHaveBeenCalled();
  });

  it('envuelve fallos de Stripe en StripeOperationError', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: null,
      ownerEmail: 'aura@example.com',
    });
    stripeMock.accounts.create.mockRejectedValue(new Error('network'));

    await expect(ensureConnectAccount(PROVIDER_ID)).rejects.toBeInstanceOf(StripeOperationError);
    expect(repoMock.setStripeAccountId).not.toHaveBeenCalled();
  });
});

describe('getConnectAccountStatus', () => {
  it('mapea charges/payouts enabled correctamente', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { currently_due: [], past_due: [] },
    });

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status).toEqual({
      exists: true,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      hasPendingRequirements: false,
    });
  });

  it('detecta requirements pendientes en currently_due o past_due', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({
      details_submitted: false,
      charges_enabled: false,
      payouts_enabled: false,
      requirements: { currently_due: ['individual.dob'], past_due: [] },
    });

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status.hasPendingRequirements).toBe(true);
    expect(status.chargesEnabled).toBe(false);
  });

  it('tolera campos de Stripe con valores undefined', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({});

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status).toEqual({
      exists: true,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      hasPendingRequirements: false,
    });
  });

  it('envuelve fallos de Stripe en StripeOperationError', async () => {
    stripeMock.accounts.retrieve.mockRejectedValue(new Error('not found'));

    await expect(getConnectAccountStatus(STRIPE_ACCOUNT_ID)).rejects.toBeInstanceOf(
      StripeOperationError,
    );
  });
});

describe('getProviderPaymentsStatus', () => {
  it('devuelve status exists=false sin tocar Stripe si no hay stripeAccountId', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: null,
      ownerEmail: 'aura@example.com',
    });

    const status = await getProviderPaymentsStatus(PROVIDER_ID);

    expect(status.exists).toBe(false);
    expect(stripeMock.accounts.retrieve).not.toHaveBeenCalled();
  });

  it('consulta Stripe cuando hay stripeAccountId', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: STRIPE_ACCOUNT_ID,
      ownerEmail: 'aura@example.com',
    });
    stripeMock.accounts.retrieve.mockResolvedValue({
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
      requirements: { currently_due: [], past_due: [] },
    });

    const status = await getProviderPaymentsStatus(PROVIDER_ID);

    expect(status.exists).toBe(true);
    expect(status.chargesEnabled).toBe(true);
    expect(stripeMock.accounts.retrieve).toHaveBeenCalledWith(STRIPE_ACCOUNT_ID);
  });

  it('lanza ProviderForPaymentsNotFoundError si no existe el provider', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(null);

    await expect(getProviderPaymentsStatus(PROVIDER_ID)).rejects.toBeInstanceOf(
      ProviderForPaymentsNotFoundError,
    );
  });
});
