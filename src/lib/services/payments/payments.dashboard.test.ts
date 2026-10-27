/**
 * Tests del acceso al dashboard Express (`createDashboardLoginLink`).
 *
 * Lo que se protege: el login link solo se pide a Stripe para cuentas
 * Express con el alta enviada; la cuenta Custom de pruebas nunca llega
 * a `accounts.createLoginLink`, que Stripe rechazaría.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  accounts: { retrieve: vi.fn(), createLoginLink: vi.fn() },
}));

vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => stripeMock,
}));

const repoMock = vi.hoisted(() => ({ findProviderForPayments: vi.fn() }));

vi.mock('./payments.repository', () => ({
  paymentsRepository: repoMock,
}));

import { createDashboardLoginLink } from './payments.dashboard';
import {
  StripeAccountNotConnectedError,
  StripeAccountNotExpressError,
  StripeDashboardUnavailableError,
  StripeOperationError,
} from './payments.errors';

const PROVIDER_ID = '70a8dc5a-2fed-4aa4-907c-ad93a49eb879';
const STRIPE_ACCOUNT_ID = 'acct_1Nxxxx';

beforeEach(() => {
  vi.clearAllMocks();
  repoMock.findProviderForPayments.mockResolvedValue({
    id: PROVIDER_ID,
    stripeAccountId: STRIPE_ACCOUNT_ID,
    ownerEmail: 'aura@example.com',
  });
});

describe('createDashboardLoginLink', () => {
  it('devuelve el login link de una cuenta Express con el alta enviada', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', details_submitted: true });
    stripeMock.accounts.createLoginLink.mockResolvedValue({
      url: 'https://connect.stripe.com/express/abc',
    });

    const link = await createDashboardLoginLink(PROVIDER_ID);

    expect(link).toEqual({ url: 'https://connect.stripe.com/express/abc' });
    expect(stripeMock.accounts.createLoginLink).toHaveBeenCalledWith(STRIPE_ACCOUNT_ID);
  });

  it('no pide login link para la cuenta Custom', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'custom', details_submitted: true });

    await expect(createDashboardLoginLink(PROVIDER_ID)).rejects.toBeInstanceOf(
      StripeAccountNotExpressError,
    );
    expect(stripeMock.accounts.createLoginLink).not.toHaveBeenCalled();
  });

  it('no pide login link si el alta no está enviada', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', details_submitted: false });

    await expect(createDashboardLoginLink(PROVIDER_ID)).rejects.toBeInstanceOf(
      StripeDashboardUnavailableError,
    );
    expect(stripeMock.accounts.createLoginLink).not.toHaveBeenCalled();
  });

  it('lanza StripeAccountNotConnectedError si no hay cuenta', async () => {
    repoMock.findProviderForPayments.mockResolvedValue({
      id: PROVIDER_ID,
      stripeAccountId: null,
      ownerEmail: 'aura@example.com',
    });

    await expect(createDashboardLoginLink(PROVIDER_ID)).rejects.toBeInstanceOf(
      StripeAccountNotConnectedError,
    );
  });

  it('envuelve el fallo de Stripe en StripeOperationError', async () => {
    stripeMock.accounts.retrieve.mockResolvedValue({ type: 'express', details_submitted: true });
    stripeMock.accounts.createLoginLink.mockRejectedValue(new Error('boom'));

    await expect(createDashboardLoginLink(PROVIDER_ID)).rejects.toBeInstanceOf(
      StripeOperationError,
    );
  });
});
