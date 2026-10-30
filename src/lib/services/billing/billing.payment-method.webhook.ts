import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';

import { commissionRepository } from './billing.commission.repository';
import { billingRepository } from './billing.repository';
import type { BillingWebhookResult } from './billing.types';

/**
 * El negocio quita (o le caduca) el método de pago de las comisiones.
 *
 * Si su Customer se queda sin `invoice_settings.default_payment_method`,
 * se limpia `onsitePaymentMethodReadyAt`: el pago en el local deja de
 * ofrecerse a clientes nuevos (§4.bis, requisito del opt-in) y el panel
 * pide volver a añadirlo. Las reservas en el local ya hechas no cambian.
 *
 * Solo limpia; nunca marca como listo: el método válido para comisiones
 * es el que se guarda con el Checkout de setup.
 *
 * Idempotente (la limpieza es condicional). Un Customer que no es de
 * ningún negocio (p. ej. de un cliente) se ignora sin error.
 */
export async function handlePaymentMethodChange(
  event: Stripe.Event,
): Promise<BillingWebhookResult> {
  const customer = await customerOf(event);
  if (!customer || customer.deleted) return { handled: false };
  const billing = await billingRepository.findByCustomerId(customer.id);
  if (!billing) return { handled: false };
  if (customer.invoice_settings?.default_payment_method) {
    return { handled: false, providerId: billing.providerId };
  }
  const cleared = await commissionRepository.clearPaymentMethodReady(billing.providerId);
  return { handled: cleared, providerId: billing.providerId };
}

/**
 * Customer afectado, **en su estado actual** (se pide a Stripe): los
 * eventos pueden llegar desordenados y un `customer.updated` viejo sin
 * método no debe borrar uno guardado después con el Checkout de setup.
 *  - `customer.updated`: el id del objeto del evento.
 *  - `payment_method.detached`: el método ya no tiene Customer; el que
 *    tenía va en `previous_attributes.customer`.
 */
async function customerOf(
  event: Stripe.Event,
): Promise<Stripe.Customer | Stripe.DeletedCustomer | null> {
  let customerId: string | null = null;
  if (event.type === 'customer.updated') customerId = event.data.object.id;
  if (event.type === 'payment_method.detached') {
    const previous = event.data.previous_attributes as { customer?: unknown } | undefined;
    customerId = typeof previous?.customer === 'string' ? previous.customer : null;
  }
  if (!customerId) return null;
  // Antes de llamar a Stripe: la mayoría de Customers no son de negocios.
  if (!(await billingRepository.findByCustomerId(customerId))) return null;
  return getStripeClient().customers.retrieve(customerId);
}
