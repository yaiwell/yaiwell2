import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import {
  ProviderForPaymentsNotFoundError,
  StripeAccountNotConnectedError,
  StripeAccountNotExpressError,
  StripeDashboardUnavailableError,
  StripeOperationError,
} from './payments.errors';
import { paymentsRepository } from './payments.repository';
import { getConnectAccountStatus } from './payments.status';

/**
 * Genera un enlace de acceso único al dashboard Express del proveedor,
 * donde ve sus cobros, pagos a su banco y puede editar sus datos.
 *
 * `accounts.createLoginLink` solo existe para cuentas Express; con la
 * cuenta Custom de pruebas Stripe devolvería error, así que lo
 * comprobamos antes. Tampoco tiene sentido antes de enviar el alta.
 *
 * El enlace es de un solo uso y caduca en minutos: no lo guardamos.
 *
 * @throws ProviderForPaymentsNotFoundError — si el provider no existe.
 * @throws StripeAccountNotConnectedError — si aún no tiene cuenta.
 * @throws StripeAccountNotExpressError — si la cuenta no es Express.
 * @throws StripeDashboardUnavailableError — si el alta no está enviada.
 * @throws StripeOperationError — si Stripe falla.
 */
export async function createDashboardLoginLink(providerId: string): Promise<{ url: string }> {
  const provider = await paymentsRepository.findProviderForPayments(providerId);
  if (!provider) {
    throw new ProviderForPaymentsNotFoundError();
  }
  if (!provider.stripeAccountId) {
    throw new StripeAccountNotConnectedError();
  }

  const status = await getConnectAccountStatus(provider.stripeAccountId);
  if (status.dashboardType !== 'express') {
    throw new StripeAccountNotExpressError();
  }
  if (!status.detailsSubmitted) {
    throw new StripeDashboardUnavailableError();
  }

  const stripe = getStripeClient();
  let link: Stripe.LoginLink;
  try {
    link = await stripe.accounts.createLoginLink(provider.stripeAccountId);
  } catch (err) {
    throw new StripeOperationError('No se pudo generar el acceso al dashboard de Stripe.', err);
  }
  return { url: link.url };
}
