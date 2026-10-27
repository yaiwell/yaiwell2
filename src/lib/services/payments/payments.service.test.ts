/**
 * Tests del alta en Stripe Connect (`payments.service`).
 *
 * Mockeamos el repository y el SDK de Stripe para comprobar que:
 *  - la cuenta Express se crea con la forma jurídica elegida;
 *  - un tipo inválido nunca llega a Stripe;
 *  - `ensureConnectAccount` es idempotente;
 *  - continuar el alta solo genera AccountLink para cuentas Express.
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

import {
  InvalidConnectBusinessTypeError,
  ProviderForPaymentsNotFoundError,
  StripeAccountAlreadyConnectedError,
  StripeAccountNotConnectedError,
  StripeAccountNotExpressError,
  StripeOperationError,
} from './payments.errors';
import {
  continueOnboardingFlow,
  ensureConnectAccount,
  startOnboardingFlow,
} from './payments.service';
import type { ConnectBusinessType } from './payments.types';

const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const STRIPE_ACCOUNT_ID = 'acct_1Nxxxx';
const URLS = {
  returnUrl: 'https://yaiwell2.vercel.app/es/panel/centro/stripe/return',
  refreshUrl: 'https://yaiwell2.vercel.app/es/panel/centro/stripe/refresh',
};

function providerWithAccount(stripeAccountId: string | null) {
  return { id: PROVIDER_ID, stripeAccountId, ownerEmail: 'aura@example.com' };
}

beforeEach(() => {
  vi.clearAllMocks();
  repoMock.setStripeAccountIdIfEmpty.mockResolvedValue(true);
});

describe('ensureConnectAccount', () => {
  it('devuelve el stripeAccountId existente sin crear cuenta nueva', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(STRIPE_ACCOUNT_ID));

    const result = await ensureConnectAccount(PROVIDER_ID, 'company');

    expect(result).toBe(STRIPE_ACCOUNT_ID);
    expect(stripeMock.accounts.create).not.toHaveBeenCalled();
    expect(repoMock.setStripeAccountIdIfEmpty).not.toHaveBeenCalled();
  });

  it.each<ConnectBusinessType>(['individual', 'company'])(
    'crea una cuenta Express con business_type=%s y la persiste',
    async (businessType) => {
      repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(null));
      stripeMock.accounts.create.mockResolvedValue({ id: 'acct_new123' });

      const result = await ensureConnectAccount(PROVIDER_ID, businessType);

      expect(result).toBe('acct_new123');
      expect(stripeMock.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        country: 'ES',
        email: 'aura@example.com',
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { providerId: PROVIDER_ID },
      });
      expect(repoMock.setStripeAccountIdIfEmpty).toHaveBeenCalledWith(PROVIDER_ID, 'acct_new123');
    },
  );

  it.each(['non_profit', 'empresa', '', undefined, null])(
    'rechaza el tipo inválido %s sin tocar BD ni Stripe',
    async (invalid) => {
      await expect(
        ensureConnectAccount(PROVIDER_ID, invalid as unknown as ConnectBusinessType),
      ).rejects.toBeInstanceOf(InvalidConnectBusinessTypeError);
      expect(repoMock.findProviderForPayments).not.toHaveBeenCalled();
      expect(stripeMock.accounts.create).not.toHaveBeenCalled();
    },
  );

  it('lanza ProviderForPaymentsNotFoundError si el provider no existe', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(null);

    await expect(ensureConnectAccount(PROVIDER_ID, 'individual')).rejects.toBeInstanceOf(
      ProviderForPaymentsNotFoundError,
    );
    expect(stripeMock.accounts.create).not.toHaveBeenCalled();
  });

  it('envuelve fallos de Stripe en StripeOperationError', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(null));
    stripeMock.accounts.create.mockRejectedValue(new Error('network'));

    await expect(ensureConnectAccount(PROVIDER_ID, 'individual')).rejects.toBeInstanceOf(
      StripeOperationError,
    );
    expect(repoMock.setStripeAccountIdIfEmpty).not.toHaveBeenCalled();
  });
});

describe('startOnboardingFlow', () => {
  it('rechaza continuar si la cuenta existente es de otro tipo', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(STRIPE_ACCOUNT_ID));
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', business_type: 'company' });

    const error = await startOnboardingFlow(PROVIDER_ID, 'individual', URLS).catch((e) => e);

    expect(error).toBeInstanceOf(StripeAccountAlreadyConnectedError);
    expect((error as StripeAccountAlreadyConnectedError).existingType).toBe('company');
    expect(stripeMock.accounts.create).not.toHaveBeenCalled();
    expect(stripeMock.accountLinks.create).not.toHaveBeenCalled();
  });

  it('continúa con la cuenta existente si el tipo coincide', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(STRIPE_ACCOUNT_ID));
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', business_type: 'company' });
    stripeMock.accountLinks.create.mockResolvedValue({ url: 'https://x', expires_at: 1 });

    await startOnboardingFlow(PROVIDER_ID, 'company', URLS);

    expect(stripeMock.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({ account: STRIPE_ACCOUNT_ID }),
    );
  });

  it('crea la cuenta con el tipo elegido y devuelve el AccountLink', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(null));
    stripeMock.accounts.create.mockResolvedValue({ id: 'acct_new123' });
    stripeMock.accountLinks.create.mockResolvedValue({
      url: 'https://connect.stripe.com/setup/e/acct_new123/abc',
      expires_at: 1_800_000_000,
    });

    const link = await startOnboardingFlow(PROVIDER_ID, 'company', URLS);

    expect(link.url).toBe('https://connect.stripe.com/setup/e/acct_new123/abc');
    expect(stripeMock.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ business_type: 'company' }),
    );
    expect(stripeMock.accountLinks.create).toHaveBeenCalledWith({
      account: 'acct_new123',
      refresh_url: URLS.refreshUrl,
      return_url: URLS.returnUrl,
      type: 'account_onboarding',
    });
  });

  it('si ya hay cuenta no crea otra y continúa el alta existente', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(STRIPE_ACCOUNT_ID));
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', details_submitted: false });
    stripeMock.accountLinks.create.mockResolvedValue({ url: 'https://x', expires_at: 1 });

    await startOnboardingFlow(PROVIDER_ID, 'individual', URLS);

    expect(stripeMock.accounts.create).not.toHaveBeenCalled();
    expect(stripeMock.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({ account: STRIPE_ACCOUNT_ID }),
    );
  });
});

describe('continueOnboardingFlow', () => {
  it('genera un AccountLink nuevo para una cuenta Express', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(STRIPE_ACCOUNT_ID));
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', details_submitted: false });
    stripeMock.accountLinks.create.mockResolvedValue({ url: 'https://x', expires_at: 1 });

    const link = await continueOnboardingFlow(PROVIDER_ID, URLS);

    expect(link).toEqual({ url: 'https://x', expiresAt: 1 });
  });

  it('rechaza la cuenta Custom de pruebas sin pedir AccountLink', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(STRIPE_ACCOUNT_ID));
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'custom', details_submitted: true });

    await expect(continueOnboardingFlow(PROVIDER_ID, URLS)).rejects.toBeInstanceOf(
      StripeAccountNotExpressError,
    );
    expect(stripeMock.accountLinks.create).not.toHaveBeenCalled();
  });

  it('lanza StripeAccountNotConnectedError si aún no hay cuenta', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(null));

    await expect(continueOnboardingFlow(PROVIDER_ID, URLS)).rejects.toBeInstanceOf(
      StripeAccountNotConnectedError,
    );
  });

  it('envuelve el fallo del AccountLink en StripeOperationError', async () => {
    repoMock.findProviderForPayments.mockResolvedValue(providerWithAccount(STRIPE_ACCOUNT_ID));
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express' });
    stripeMock.accountLinks.create.mockRejectedValue(new Error('invalid url'));

    await expect(continueOnboardingFlow(PROVIDER_ID, URLS)).rejects.toBeInstanceOf(
      StripeOperationError,
    );
  });
});
