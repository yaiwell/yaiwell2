/**
 * Tests de las server actions de Stripe Connect en `/panel/centro`.
 *
 * Mockeamos el guard, `next/navigation` y el dominio `payments`. Lo que
 * se protege: un tipo de cuenta inválido nunca llega al service, las
 * URLs de vuelta salen de `SITE_URL` y los errores tipados se traducen
 * a códigos estables sin filtrar mensajes internos.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mocks = vi.hoisted(() => {
  class InvalidConnectBusinessTypeError extends Error {}
  class ProviderForPaymentsNotFoundError extends Error {}
  class StripeAccountNotConnectedError extends Error {}
  class StripeAccountNotExpressError extends Error {}
  class StripeDashboardUnavailableError extends Error {}
  class StripeOperationError extends Error {}
  class StripeAccountAlreadyConnectedError extends Error {
    constructor(readonly existingType: string) {
      super(existingType);
    }
  }
  return {
    requireCurrentProvider: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    revalidatePath: vi.fn(),
    startOnboardingFlow: vi.fn(),
    continueOnboardingFlow: vi.fn(),
    createDashboardLoginLink: vi.fn(),
    errors: {
      InvalidConnectBusinessTypeError,
      ProviderForPaymentsNotFoundError,
      StripeAccountNotConnectedError,
      StripeAccountNotExpressError,
      StripeDashboardUnavailableError,
      StripeOperationError,
      StripeAccountAlreadyConnectedError,
    },
  };
});

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/auth/server', () => ({ requireCurrentProvider: mocks.requireCurrentProvider }));
vi.mock('@/lib/seo/site-url', () => ({ SITE_URL: 'https://yaiwell2.vercel.app' }));
vi.mock('@/lib/services/payments', () => ({
  ...mocks.errors,
  startOnboardingFlow: mocks.startOnboardingFlow,
  continueOnboardingFlow: mocks.continueOnboardingFlow,
  createDashboardLoginLink: mocks.createDashboardLoginLink,
  buildConnectReturnUrls: (base: string, locale: string) => ({
    returnUrl: `${base}/${locale}/panel/centro/stripe/return`,
    refreshUrl: `${base}/${locale}/panel/centro/stripe/refresh`,
  }),
  startConnectOnboardingSchema: z.object({ businessType: z.enum(['individual', 'company']) }),
}));

import {
  continueStripeOnboardingAction,
  openStripeDashboardAction,
  refreshStripeStatusAction,
  startStripeOnboardingAction,
} from './actions';

const PROVIDER_ID = 'prov-uuid';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  mocks.requireCurrentProvider.mockResolvedValue({ id: PROVIDER_ID });
});

describe('startStripeOnboardingAction', () => {
  it.each([{ businessType: 'non_profit' }, { businessType: '' }, {}, null, 'company'])(
    'rechaza el input inválido %j sin llamar al service',
    async (input) => {
      const result = await startStripeOnboardingAction('es', input);

      expect(result).toEqual({ ok: false, code: 'INVALID_INPUT' });
      expect(mocks.startOnboardingFlow).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );

  it('pasa el tipo y las URLs de SITE_URL y redirige a Stripe', async () => {
    mocks.startOnboardingFlow.mockResolvedValue({ url: 'https://connect.stripe.com/setup/x' });

    await expect(startStripeOnboardingAction('ca', { businessType: 'company' })).rejects.toThrow(
      'NEXT_REDIRECT:https://connect.stripe.com/setup/x',
    );

    expect(mocks.requireCurrentProvider).toHaveBeenCalledWith('ca');
    expect(mocks.startOnboardingFlow).toHaveBeenCalledWith(PROVIDER_ID, 'company', {
      returnUrl: 'https://yaiwell2.vercel.app/ca/panel/centro/stripe/return',
      refreshUrl: 'https://yaiwell2.vercel.app/ca/panel/centro/stripe/refresh',
    });
  });

  it('traduce StripeOperationError a STRIPE_FAILED', async () => {
    mocks.startOnboardingFlow.mockRejectedValue(new mocks.errors.StripeOperationError('x'));

    const result = await startStripeOnboardingAction('es', { businessType: 'individual' });

    expect(result).toEqual({ ok: false, code: 'STRIPE_FAILED' });
  });

  it('traduce un error inesperado a INTERNAL', async () => {
    mocks.startOnboardingFlow.mockRejectedValue(new Error('boom'));

    const result = await startStripeOnboardingAction('es', { businessType: 'individual' });

    expect(result).toEqual({ ok: false, code: 'INTERNAL' });
  });
});

describe('locale inválido', () => {
  it.each([
    [
      'startStripeOnboardingAction',
      () => startStripeOnboardingAction('xx' as 'es', { businessType: 'company' }),
    ],
    ['continueStripeOnboardingAction', () => continueStripeOnboardingAction('../es' as 'es')],
    ['openStripeDashboardAction', () => openStripeDashboardAction('xx' as 'es')],
    ['refreshStripeStatusAction', () => refreshStripeStatusAction('xx' as 'es')],
  ])('%s devuelve INVALID_INPUT sin llamar a nada', async (_name, call) => {
    const result = await call();

    expect(result).toEqual({ ok: false, code: 'INVALID_INPUT' });
    expect(mocks.requireCurrentProvider).not.toHaveBeenCalled();
    expect(mocks.startOnboardingFlow).not.toHaveBeenCalled();
    expect(mocks.continueOnboardingFlow).not.toHaveBeenCalled();
    expect(mocks.createDashboardLoginLink).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('startStripeOnboardingAction — cuenta de otro tipo', () => {
  it('devuelve ALREADY_CONNECTED con el tipo existente y recarga el panel', async () => {
    mocks.startOnboardingFlow.mockRejectedValue(
      new mocks.errors.StripeAccountAlreadyConnectedError('individual'),
    );

    const result = await startStripeOnboardingAction('es', { businessType: 'company' });

    expect(result).toEqual({ ok: false, code: 'ALREADY_CONNECTED', existingType: 'individual' });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/es/panel/centro');
  });
});

describe('continueStripeOnboardingAction', () => {
  it('redirige al AccountLink nuevo', async () => {
    mocks.continueOnboardingFlow.mockResolvedValue({ url: 'https://connect.stripe.com/setup/y' });

    await expect(continueStripeOnboardingAction('es')).rejects.toThrow(
      'NEXT_REDIRECT:https://connect.stripe.com/setup/y',
    );
  });

  it('devuelve NOT_EXPRESS para la cuenta Custom', async () => {
    mocks.continueOnboardingFlow.mockRejectedValue(
      new mocks.errors.StripeAccountNotExpressError('x'),
    );

    const result = await continueStripeOnboardingAction('es');

    expect(result).toEqual({ ok: false, code: 'NOT_EXPRESS' });
  });
});

describe('openStripeDashboardAction', () => {
  it('redirige al login link del dashboard Express', async () => {
    mocks.createDashboardLoginLink.mockResolvedValue({
      url: 'https://connect.stripe.com/express/z',
    });

    await expect(openStripeDashboardAction('es')).rejects.toThrow(
      'NEXT_REDIRECT:https://connect.stripe.com/express/z',
    );
  });

  it('devuelve DASHBOARD_UNAVAILABLE si el alta no está enviada', async () => {
    mocks.createDashboardLoginLink.mockRejectedValue(
      new mocks.errors.StripeDashboardUnavailableError('x'),
    );

    const result = await openStripeDashboardAction('es');

    expect(result).toEqual({ ok: false, code: 'DASHBOARD_UNAVAILABLE' });
  });
});
