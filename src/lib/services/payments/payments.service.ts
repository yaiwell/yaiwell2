import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import {
  ProviderForPaymentsNotFoundError,
  StripeAccountNotConnectedError,
  StripeOperationError,
} from './payments.errors';
import { paymentsRepository } from './payments.repository';
import type { ConnectAccountStatus, ConnectOnboardingLink } from './payments.types';

/**
 * Service del dominio `payments` (Stripe Connect).
 *
 * Cubre el onboarding del Provider a una cuenta Express:
 *  - `ensureConnectAccount`: idempotente — si ya hay `stripeAccountId`,
 *    lo devuelve; si no, crea la cuenta en Stripe y la persiste.
 *  - `createOnboardingLink`: genera un Account Link de un solo uso
 *    (URL temporal de Stripe) al que redirigimos al usuario.
 *  - `getConnectAccountStatus`: consulta Stripe bajo demanda — no
 *    cacheamos el estado para no quedarnos desincronizados de la
 *    realidad de la cuenta.
 *
 * El cliente Stripe se inicializa de forma perezosa en `getStripeClient`,
 * así que importar este módulo no requiere `STRIPE_SECRET_KEY` en el
 * momento del bundle.
 */

/**
 * Obtiene o crea la cuenta Stripe Connect (Express) del provider.
 *
 * @returns el `stripeAccountId` (existente o recién creado).
 * @throws ProviderForPaymentsNotFoundError — si el provider no existe.
 * @throws StripeOperationError — si Stripe rechaza la creación.
 */
export async function ensureConnectAccount(providerId: string): Promise<string> {
  const provider = await paymentsRepository.findProviderForPayments(providerId);
  if (!provider) {
    throw new ProviderForPaymentsNotFoundError();
  }
  if (provider.stripeAccountId) {
    return provider.stripeAccountId;
  }

  const stripe = getStripeClient();
  let account: Stripe.Account;
  try {
    // `controller` con `losses.payments = 'application'` indica que la
    // plataforma asume las pérdidas (refunds, chargebacks). `fees.payer
    // = 'application'` indica que las fees de Stripe las paga la
    // plataforma. Ambas son la configuración estándar para marketplaces.
    account = await stripe.accounts.create({
      type: 'express',
      country: 'ES',
      email: provider.ownerEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        providerId: provider.id,
      },
    });
  } catch (err) {
    throw new StripeOperationError('No se pudo crear la cuenta Stripe Connect.', err);
  }

  await paymentsRepository.setStripeAccountId(provider.id, account.id);
  return account.id;
}

/**
 * Crea un Account Link de Stripe para que el usuario complete el
 * onboarding (KYC, datos bancarios, TOS). Los URLs `returnUrl` y
 * `refreshUrl` los compone el caller a partir del locale activo.
 *
 * El link es de un solo uso y expira en ~5 minutos: no lo cacheamos.
 *
 * @throws StripeOperationError — si Stripe rechaza la creación.
 */
export async function createOnboardingLink(
  stripeAccountId: string,
  options: { returnUrl: string; refreshUrl: string },
): Promise<ConnectOnboardingLink> {
  const stripe = getStripeClient();
  let link: Stripe.AccountLink;
  try {
    link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: options.refreshUrl,
      return_url: options.returnUrl,
      type: 'account_onboarding',
    });
  } catch (err) {
    throw new StripeOperationError('No se pudo generar el enlace de onboarding de Stripe.', err);
  }
  return { url: link.url, expiresAt: link.expires_at };
}

/**
 * Consulta el estado de habilitación de una cuenta conectada.
 *
 * @throws StripeOperationError — si Stripe rechaza la lectura.
 */
export async function getConnectAccountStatus(
  stripeAccountId: string,
): Promise<ConnectAccountStatus> {
  const stripe = getStripeClient();
  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(stripeAccountId);
  } catch (err) {
    throw new StripeOperationError('No se pudo consultar el estado de la cuenta Stripe.', err);
  }

  const pendingRequirements =
    (account.requirements?.currently_due ?? []).length > 0 ||
    (account.requirements?.past_due ?? []).length > 0;

  return {
    exists: true,
    detailsSubmitted: account.details_submitted ?? false,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    hasPendingRequirements: pendingRequirements,
  };
}

/**
 * Devuelve el estado de pagos del provider en un solo lookup combinado.
 *
 * Composición usada por la UI del panel: lee el `stripeAccountId` y, si
 * existe, consulta Stripe; si no, devuelve `{exists: false, ...}` para
 * que la UI pinte el CTA "Conectar con Stripe".
 *
 * @throws ProviderForPaymentsNotFoundError — si el provider no existe.
 */
export async function getProviderPaymentsStatus(providerId: string): Promise<ConnectAccountStatus> {
  const provider = await paymentsRepository.findProviderForPayments(providerId);
  if (!provider) {
    throw new ProviderForPaymentsNotFoundError();
  }
  if (!provider.stripeAccountId) {
    return {
      exists: false,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      hasPendingRequirements: false,
    };
  }
  return getConnectAccountStatus(provider.stripeAccountId);
}

/**
 * Atajo: para que la action no tenga que mezclar lookup + ensure +
 * link, expone el flujo completo "dame URL de onboarding del provider".
 *
 * @throws StripeAccountNotConnectedError — nunca lanza (es defensivo
 *   por si el lookup falla por una carrera).
 */
export async function startOnboardingFlow(
  providerId: string,
  options: { returnUrl: string; refreshUrl: string },
): Promise<ConnectOnboardingLink> {
  const stripeAccountId = await ensureConnectAccount(providerId);
  if (!stripeAccountId) {
    throw new StripeAccountNotConnectedError();
  }
  return createOnboardingLink(stripeAccountId, options);
}
