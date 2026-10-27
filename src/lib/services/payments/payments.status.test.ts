/**
 * Tests de la lectura de estado (`payments.status`) y de los mappers
 * puros: flags de habilitación, requisitos, forma jurídica, tipo de
 * dashboard y URLs de vuelta.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({ accounts: { retrieve: vi.fn() } }));

vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => stripeMock,
}));

const repoMock = vi.hoisted(() => ({ findProviderForPayments: vi.fn() }));

vi.mock('./payments.repository', () => ({
  paymentsRepository: repoMock,
}));

import { ProviderForPaymentsNotFoundError, StripeOperationError } from './payments.errors';
import { buildConnectReturnUrls, NO_CONNECT_ACCOUNT_STATUS } from './payments.mappers';
import { getConnectAccountStatus, getProviderPaymentsStatus } from './payments.status';

const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const STRIPE_ACCOUNT_ID = 'acct_1Nxxxx';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getConnectAccountStatus', () => {
  it('mapea una cuenta Express de sociedad totalmente activa', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({
      type: 'express',
      business_type: 'company',
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
      hasPastDueRequirements: false,
      disabledReason: null,
      isDisabled: false,
      businessType: 'company',
      dashboardType: 'express',
    });
  });

  it('detecta requisitos en currently_due y past_due por separado', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({
      type: 'express',
      business_type: 'individual',
      requirements: { currently_due: ['individual.dob.day'], past_due: ['external_account'] },
    });

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status.hasPendingRequirements).toBe(true);
    expect(status.hasPastDueRequirements).toBe(true);
    expect(status.businessType).toBe('individual');
  });

  it.each([
    ['rejected.other', true],
    ['under_review', true],
    ['platform_paused', true],
    ['requirements.past_due', false],
    ['requirements.pending_verification', false],
  ])('disabled_reason=%s → isDisabled=%s', async (reason, expected) => {
    stripeMock.accounts.retrieve.mockResolvedValue({
      type: 'express',
      requirements: { currently_due: [], past_due: [], disabled_reason: reason },
    });

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status.disabledReason).toBe(reason);
    expect(status.isDisabled).toBe(expected);
  });

  it('clasifica la cuenta Custom de pruebas como custom', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'custom', business_type: 'individual' });

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status.dashboardType).toBe('custom');
  });

  it('reconoce Express por controller.stripe_dashboard cuando type es none', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({
      type: 'none',
      controller: { stripe_dashboard: { type: 'express' }, requirement_collection: 'stripe' },
    });

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status.dashboardType).toBe('express');
  });

  it('tolera una cuenta sin campos y marca businessType null', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({});

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status).toEqual({
      ...NO_CONNECT_ACCOUNT_STATUS,
      exists: true,
      dashboardType: 'unknown',
    });
  });

  it('marca como other un business_type que no ofrecemos', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({
      type: 'express',
      business_type: 'non_profit',
    });

    const status = await getConnectAccountStatus(STRIPE_ACCOUNT_ID);

    expect(status.businessType).toBe('other');
  });

  it('envuelve fallos de Stripe en StripeOperationError', async () => {
    stripeMock.accounts.retrieve.mockRejectedValue(new Error('not found'));

    await expect(getConnectAccountStatus(STRIPE_ACCOUNT_ID)).rejects.toBeInstanceOf(
      StripeOperationError,
    );
  });
});

describe('getProviderPaymentsStatus', () => {
  it('devuelve exists=false sin tocar Stripe si no hay stripeAccountId', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: null,
      ownerEmail: 'aura@example.com',
    });

    const status = await getProviderPaymentsStatus(PROVIDER_ID);

    expect(status).toEqual(NO_CONNECT_ACCOUNT_STATUS);
    expect(stripeMock.accounts.retrieve).not.toHaveBeenCalled();
  });

  it('consulta Stripe cuando hay stripeAccountId', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: STRIPE_ACCOUNT_ID,
      ownerEmail: 'aura@example.com',
    });
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', charges_enabled: true });

    const status = await getProviderPaymentsStatus(PROVIDER_ID);

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

describe('buildConnectReturnUrls', () => {
  it('compone return y refresh con el locale y sin dobles barras', () => {
    expect(buildConnectReturnUrls('https://yaiwell2.vercel.app/', 'ca')).toEqual({
      returnUrl: 'https://yaiwell2.vercel.app/ca/panel/centro/stripe/return',
      refreshUrl: 'https://yaiwell2.vercel.app/ca/panel/centro/stripe/refresh',
    });
  });
});
