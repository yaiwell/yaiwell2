import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { ProviderForPaymentsNotFoundError, StripeOperationError } from './payments.errors';
import { mapAccountToStatus, NO_CONNECT_ACCOUNT_STATUS } from './payments.mappers';
import { paymentsRepository } from './payments.repository';
import type { ConnectAccountStatus } from './payments.types';

/**
 * Lectura del estado de cuentas conectadas.
 *
 * Consultamos Stripe bajo demanda: no cacheamos el estado para no
 * quedarnos desincronizados de requisitos nuevos o cuentas suspendidas.
 */

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
  return mapAccountToStatus(account);
}

/**
 * Devuelve el estado de pagos del provider.
 *
 * Si no tiene `stripeAccountId` devuelve `exists: false` sin llamar a
 * Stripe, para que la UI pinte la elección de forma jurídica y el CTA
 * "Conectar con Stripe".
 *
 * @throws ProviderForPaymentsNotFoundError — si el provider no existe.
 * @throws StripeOperationError — si Stripe rechaza la lectura.
 */
export async function getProviderPaymentsStatus(providerId: string): Promise<ConnectAccountStatus> {
  const provider = await paymentsRepository.findProviderForPayments(providerId);
  if (!provider) {
    throw new ProviderForPaymentsNotFoundError();
  }
  if (!provider.stripeAccountId) {
    return NO_CONNECT_ACCOUNT_STATUS;
  }
  return getConnectAccountStatus(provider.stripeAccountId);
}
