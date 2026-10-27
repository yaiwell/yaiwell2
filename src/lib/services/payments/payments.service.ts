import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import {
  InvalidConnectBusinessTypeError,
  ProviderForPaymentsNotFoundError,
  StripeAccountAlreadyConnectedError,
  StripeAccountNotConnectedError,
  StripeAccountNotExpressError,
  StripeOperationError,
} from './payments.errors';
import { deleteOrphanAccount, resolveLostCreationRace } from './payments.orphans';
import { paymentsRepository } from './payments.repository';
import { getConnectAccountStatus } from './payments.status';
import type {
  ConnectAccountStatus,
  ConnectBusinessType,
  ConnectOnboardingLink,
  ConnectReturnUrls,
} from './payments.types';
import { connectBusinessTypeSchema } from './payments.validation';

/**
 * Service de alta en Stripe Connect (cuentas Express).
 *
 *  - `ensureConnectAccount`: idempotente. Si ya hay `stripeAccountId` lo
 *    devuelve; si no, crea la cuenta con la forma jurídica elegida.
 *  - `createOnboardingLink`: AccountLink de un solo uso al formulario
 *    alojado por Stripe.
 *  - `startOnboardingFlow`: primera alta (crear cuenta + enlace).
 *  - `continueOnboardingFlow`: alta a medias o requisitos pendientes.
 *
 * Sobre cambiar la forma jurídica: la API de Stripe solo permite
 * actualizar `business_type` de una cuenta Express hasta que se crea el
 * primer AccountLink (https://docs.stripe.com/api/accounts/update, campo
 * `business_type`; para Custom sí se podría). Como creamos el enlace
 * justo después de la cuenta, en la práctica queda fijada al crearla y
 * no ofrecemos "cambiar tipo"; el cambio se hace por soporte borrando la
 * cuenta sin actividad y creando otra.
 */

/**
 * Obtiene o crea la cuenta Stripe Connect (Express) del provider.
 *
 * Si la cuenta ya existe se devuelve tal cual y `businessType` se
 * ignora; quien necesite respetar la elección del usuario debe usar
 * `startOnboardingFlow`, que rechaza un tipo distinto.
 *
 * @throws InvalidConnectBusinessTypeError — si el tipo no es válido.
 * @throws ProviderForPaymentsNotFoundError — si el provider no existe.
 * @throws StripeOperationError — si Stripe rechaza la creación.
 */
export async function ensureConnectAccount(
  providerId: string,
  businessType: ConnectBusinessType,
): Promise<string> {
  const parsed = connectBusinessTypeSchema.safeParse(businessType);
  if (!parsed.success) {
    throw new InvalidConnectBusinessTypeError();
  }

  const provider = await paymentsRepository.findProviderForPayments(providerId);
  if (!provider) {
    throw new ProviderForPaymentsNotFoundError();
  }
  if (provider.stripeAccountId) {
    return provider.stripeAccountId;
  }

  let account: Stripe.Account;
  try {
    // Express + ES: Stripe aloja el KYC y el proveedor tiene su propio
    // dashboard ligero. Fijar `business_type` aquí hace que el formulario
    // pida directamente los datos de autónomo o de sociedad.
    account = await getStripeClient().accounts.create({
      type: 'express',
      country: 'ES',
      email: provider.ownerEmail,
      business_type: parsed.data,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { providerId: provider.id },
    });
  } catch (err) {
    throw new StripeOperationError('No se pudo crear la cuenta Stripe Connect.', err);
  }

  let saved: boolean;
  try {
    saved = await paymentsRepository.setStripeAccountIdIfEmpty(provider.id, account.id);
  } catch (err) {
    // La cuenta existe en Stripe pero no quedó enlazada: la borramos para
    // no dejar huérfanas y propagamos el fallo original.
    await deleteOrphanAccount(provider.id, account.id);
    throw err;
  }
  if (saved) {
    return account.id;
  }
  return resolveLostCreationRace(provider.id, account.id);
}

/**
 * Crea un AccountLink para que el usuario complete o actualice el alta
 * (KYC, datos bancarios, términos). Sirve igual para la primera vez que
 * para requisitos nuevos tras el alta: Stripe solo pide lo pendiente.
 *
 * El enlace es de un solo uso y caduca en minutos: no lo cacheamos.
 *
 * @throws StripeOperationError — si Stripe rechaza la creación.
 */
export async function createOnboardingLink(
  stripeAccountId: string,
  urls: ConnectReturnUrls,
): Promise<ConnectOnboardingLink> {
  let link: Stripe.AccountLink;
  try {
    link = await getStripeClient().accountLinks.create({
      account: stripeAccountId,
      refresh_url: urls.refreshUrl,
      return_url: urls.returnUrl,
      type: 'account_onboarding',
    });
  } catch (err) {
    throw new StripeOperationError('No se pudo generar el enlace de onboarding de Stripe.', err);
  }
  return { url: link.url, expiresAt: link.expires_at };
}

/** Enlace para una cuenta existente; solo Express usa el formulario alojado. */
function linkForExistingAccount(
  stripeAccountId: string,
  status: ConnectAccountStatus,
  urls: ConnectReturnUrls,
): Promise<ConnectOnboardingLink> {
  if (status.dashboardType !== 'express') {
    throw new StripeAccountNotExpressError();
  }
  return createOnboardingLink(stripeAccountId, urls);
}

/**
 * Primera alta: crea la cuenta con la forma jurídica elegida y devuelve
 * el enlace al formulario de Stripe.
 *
 * Si el proveedor ya tenía cuenta (otra pestaña, doble clic) seguimos
 * con ella solo si el tipo coincide; si no, no ignoramos en silencio la
 * elección del usuario y lanzamos `StripeAccountAlreadyConnectedError`.
 *
 * @throws InvalidConnectBusinessTypeError | ProviderForPaymentsNotFoundError
 *   | StripeAccountAlreadyConnectedError | StripeAccountNotExpressError
 *   | StripeOperationError
 */
export async function startOnboardingFlow(
  providerId: string,
  businessType: ConnectBusinessType,
  urls: ConnectReturnUrls,
): Promise<ConnectOnboardingLink> {
  const provider = await paymentsRepository.findProviderForPayments(providerId);
  if (provider?.stripeAccountId) {
    const status = await getConnectAccountStatus(provider.stripeAccountId);
    if (status.businessType !== null && status.businessType !== businessType) {
      throw new StripeAccountAlreadyConnectedError(status.businessType);
    }
    return linkForExistingAccount(provider.stripeAccountId, status, urls);
  }
  const stripeAccountId = await ensureConnectAccount(providerId, businessType);
  return createOnboardingLink(stripeAccountId, urls);
}

/**
 * Alta a medias o requisitos pendientes: genera un AccountLink nuevo
 * para la cuenta existente. Lo usan el botón "Continuar el alta" y la
 * página `stripe/refresh` cuando el enlace anterior caducó.
 *
 * @throws ProviderForPaymentsNotFoundError — si el provider no existe.
 * @throws StripeAccountNotConnectedError — si aún no tiene cuenta.
 * @throws StripeAccountNotExpressError — si la cuenta no es Express.
 * @throws StripeOperationError — si Stripe falla.
 */
export async function continueOnboardingFlow(
  providerId: string,
  urls: ConnectReturnUrls,
): Promise<ConnectOnboardingLink> {
  const provider = await paymentsRepository.findProviderForPayments(providerId);
  if (!provider) {
    throw new ProviderForPaymentsNotFoundError();
  }
  if (!provider.stripeAccountId) {
    throw new StripeAccountNotConnectedError();
  }
  const status = await getConnectAccountStatus(provider.stripeAccountId);
  return linkForExistingAccount(provider.stripeAccountId, status, urls);
}
