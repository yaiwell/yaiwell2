import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { toStripeLocale } from './billing.catalog';
import { BillingProviderNotFoundError, BillingStripeError } from './billing.errors';
import { reportBillingIssue } from './billing.report';
import { billingRepository } from './billing.repository';

/**
 * Obtiene o crea el Customer de Stripe del negocio (en la cuenta de la
 * plataforma, no en su cuenta Connect: la cuota del plan la cobra
 * Yaiwell). Sirve a cualquier plan, también al Gratis, para poder cobrar
 * en el futuro las comisiones del pago en el local en la misma factura.
 *
 * Concurrencia (doble clic, dos pestañas):
 *  - La `idempotencyKey` hace que dos peticiones en 24 h reciban el
 *    mismo Customer: la que pierde el insert encuentra la fila con ese
 *    mismo id y lo devuelve sin borrar nada.
 *  - Si gana otra fila con un Customer distinto (clave caducada o datos
 *    distintos), el nuestro es huérfano y se borra (solo ese id).
 *  - Si el insert falla por BD NO borramos el Customer: un reintento en
 *    24 h recibe el mismo id por la clave y lo enlaza. Borrarlo haría que
 *    el reintento enlazase un Customer ya eliminado.
 *
 * @returns id del Customer (`cus_…`).
 * @throws BillingProviderNotFoundError — si el negocio no existe.
 * @throws BillingStripeError — si Stripe rechaza la creación.
 */
export async function ensureBillingCustomer(providerId: string): Promise<string> {
  const existing = await billingRepository.findByProviderId(providerId);
  if (existing) return existing.stripeCustomerId;

  const provider = await billingRepository.findProviderForBilling(providerId);
  if (!provider) throw new BillingProviderNotFoundError();

  let customer: Stripe.Customer;
  try {
    customer = await getStripeClient().customers.create(
      {
        email: provider.ownerEmail,
        name: provider.businessName,
        // Idioma de facturas y correos de Stripe: el del dueño.
        preferred_locales: [toStripeLocale(provider.ownerLocale)],
        metadata: { providerId: provider.id },
      },
      { idempotencyKey: `billing-customer:${provider.id}` },
    );
  } catch (err) {
    throw new BillingStripeError('Could not create the billing customer.', err);
  }

  if (await billingRepository.insertIfAbsent(provider.id, customer.id)) {
    return customer.id;
  }
  return resolveLostCustomerRace(provider.id, customer.id);
}

/**
 * Otra petición guardó antes su fila. Si es el mismo Customer (misma
 * clave de idempotencia) no hay nada que limpiar; si no, borramos el
 * nuestro, que no tiene suscripciones ni pagos.
 */
async function resolveLostCustomerRace(providerId: string, ourCustomerId: string) {
  const winner = await billingRepository.findByProviderId(providerId);
  if (!winner) throw new BillingProviderNotFoundError();
  if (winner.stripeCustomerId !== ourCustomerId) {
    await deleteOrphanCustomer(providerId, ourCustomerId);
  }
  return winner.stripeCustomerId;
}

/** Borra el Customer huérfano; si falla, queda en Sentry para soporte. */
async function deleteOrphanCustomer(providerId: string, customerId: string): Promise<void> {
  try {
    await getStripeClient().customers.del(customerId);
  } catch (err) {
    reportBillingIssue(err, providerId, { orphanStripeCustomerId: customerId });
  }
}
