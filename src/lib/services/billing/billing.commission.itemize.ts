import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/integrations/stripe';
import type { LocalizedText } from '@/types/domain';

import { hasOpenPlanCheckout } from './billing.checkout-sessions';
import { buildCommissionItemDescription } from './billing.commission.description';
import { commissionItemIdempotencyKey } from './billing.commission.period';
import { reconcileItemInvoice } from './billing.commission.reconcile';
import { commissionRepository } from './billing.commission.repository';
import { ensureBillingCustomer } from './billing.customer';
import { reportBillingIssue } from './billing.report';
import { resolveVatTaxRate } from './billing.tax';
import type { ItemizeCommission, ItemizeCommissionOutcome } from './billing.types';

/** Moneda de las comisiones (la de las reservas). */
const COMMISSION_CURRENCY = 'eur';

/**
 * Stripe recuerda una clave de idempotencia 24 h. Pasado (casi) ese
 * plazo, antes de crear el concepto buscamos si ya existe uno de esta
 * reserva: cubre el caso «Stripe lo creó pero no pudimos guardarlo en BD»
 * y evita cobrar dos veces la misma comisión.
 */
const IDEMPOTENCY_SAFE_WINDOW_MS = 20 * 60 * 60 * 1000;

/** Motivo guardado en la fila cuando se aplaza por un Checkout de plan abierto. */
export const PLAN_CHECKOUT_OPEN = 'deferred: plan checkout open';

/** Tope por llamada: el cron tiene presupuesto de tiempo y la action, `after()`. */
const STRIPE_TIMEOUT_MS = 10_000;

/**
 * Pasa a Stripe la comisión de una reserva en el local completada: crea
 * un concepto (invoice item) en el Customer del negocio, con el IVA del
 * 21 % incluido (mismo Tax Rate que las cuotas de plan).
 *
 * Sin `subscription`: si el negocio tiene suscripción viva, el concepto
 * entra solo en su siguiente factura; si no, lo recoge la factura mensual
 * suelta del cron (`invoicePendingCommissions`).
 *
 * Idempotente (clave `onsite-commission:<bookingId>` + escritura
 * condicional `pending` → `itemized`). **Nunca lanza por Stripe**: deja
 * la fila en `pending` con `lastError` y devuelve `retry_later`.
 *
 * @param chargeId — fila de `onsite_commission_charges`.
 * @throws solo si falla la BD (lectura o escritura de la fila).
 */
export const itemizeCommission: ItemizeCommission = async (chargeId) =>
  itemizeCommissionAt(chargeId, new Date());

/** Igual que `itemizeCommission`, con el instante inyectable. */
export async function itemizeCommissionAt(
  chargeId: string,
  now: Date,
): Promise<ItemizeCommissionOutcome> {
  const charge = await commissionRepository.findChargeForItemize(chargeId);
  if (!charge || charge.status !== 'pending') return 'already_itemized';

  if (charge.amountCents === 0) {
    await commissionRepository.markNothingToCharge(charge.id, now);
    return 'already_itemized';
  }

  let item: Stripe.InvoiceItem;
  try {
    const customerId = await ensureBillingCustomer(charge.providerId);
    const existing =
      now.getTime() - charge.createdAt.getTime() > IDEMPOTENCY_SAFE_WINDOW_MS
        ? await findExistingItem(customerId, charge.bookingId, charge.createdAt)
        : null;
    // Checkout de plan abierto: un concepto creado ahora entraría en la
    // primera factura de la suscripción sin verse en la página de pago.
    // Se aplaza (fila `pending`) y lo reintenta el cron; las sesiones
    // caducan a las 24 h. Ventana que queda: un concepto creado justo
    // entre la factura previa al plan (`invoiceCommissionsBeforePlan`) y
    // la creación de la sesión, o desde otra petición en ese mismo instante.
    if (!existing && (await hasOpenPlanCheckout(customerId))) {
      await commissionRepository.recordItemizeError(charge.id, PLAN_CHECKOUT_OPEN, now);
      return 'retry_later';
    }
    item =
      existing ??
      (await getStripeClient().invoiceItems.create(
        {
          customer: customerId,
          amount: charge.amountCents,
          currency: COMMISSION_CURRENCY,
          description: buildCommissionItemDescription(
            charge.provider.owner.locale,
            // `Service.name` es un JSON con los textos por idioma.
            charge.booking.service.name as unknown as LocalizedText,
            charge.booking.startAt,
          ),
          // IVA en el concepto: si no, una factura suelta no lo llevaría
          // (las cuotas lo tienen en la suscripción, no en el Customer).
          tax_rates: [await resolveVatTaxRate()],
          metadata: {
            kind: 'onsite_commission',
            bookingId: charge.bookingId,
            providerId: charge.providerId,
            chargeId: charge.id,
          },
        },
        {
          idempotencyKey: commissionItemIdempotencyKey(charge.bookingId),
          timeout: STRIPE_TIMEOUT_MS,
        },
      ));
  } catch (err) {
    reportBillingIssue(err, charge.providerId, { onsiteCommissionChargeId: charge.id });
    await commissionRepository.recordItemizeError(charge.id, describeError(err), now);
    return 'retry_later';
  }

  const changed = await commissionRepository.markItemized(charge.id, item.id, now);
  if (!changed) return 'already_itemized';
  // Concepto recuperado que ya está en una factura: alinea su estado.
  if (item.invoice) await reconcileItemInvoice(charge.providerId, item, now);
  return 'itemized';
}

/**
 * Concepto ya creado para esta reserva (fuera de la ventana de la clave
 * de idempotencia). Solo mira los creados desde la fila, así que la lista
 * es corta.
 */
async function findExistingItem(
  customerId: string,
  bookingId: string,
  since: Date,
): Promise<Stripe.InvoiceItem | null> {
  const items = await getStripeClient()
    .invoiceItems.list(
      { customer: customerId, created: { gte: Math.floor(since.getTime() / 1000) }, limit: 100 },
      { timeout: STRIPE_TIMEOUT_MS },
    )
    .autoPagingToArray({ limit: 1000 });
  return (
    items.find(
      (item) =>
        item.metadata?.kind === 'onsite_commission' && item.metadata?.bookingId === bookingId,
    ) ?? null
  );
}

/** Motivo corto para soporte (sin datos personales: códigos de Stripe). */
function describeError(err: unknown): string {
  if (err && typeof err === 'object') {
    const { code, type, message } = err as { code?: unknown; type?: unknown; message?: unknown };
    const label = [type, code].filter((part) => typeof part === 'string').join('/');
    if (label) return `${label}: ${typeof message === 'string' ? message : ''}`;
    if (typeof message === 'string') return message;
  }
  return 'unknown error';
}
