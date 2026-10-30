import 'server-only';

import type { OnsiteCommissionStatus } from '@prisma/client';
import type Stripe from 'stripe';

import { prisma } from '@/lib/db/prisma';
import { getStripeClient } from '@/lib/integrations/stripe';

import { commissionRepository } from './billing.commission.repository';
import { billingRepository } from './billing.repository';

/** Eventos de factura que mueven el estado de las comisiones. */
export type CommissionInvoiceEventType =
  | 'invoice.finalized'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'invoice.payment_action_required'
  | 'invoice.marked_uncollectible'
  | 'invoice.voided';

/**
 * Transición de las comisiones por evento. Solo hacia delante: un evento
 * que llega tarde (un `finalized` después del `paid`) no retrocede nada.
 * `pending` no aparece: sin concepto en Stripe no puede estar en una factura.
 */
const TRANSITIONS: Record<
  CommissionInvoiceEventType,
  { from: OnsiteCommissionStatus[]; to: OnsiteCommissionStatus }
> = {
  'invoice.finalized': { from: ['itemized'], to: 'invoiced' },
  'invoice.paid': { from: ['itemized', 'invoiced', 'failed'], to: 'paid' },
  'invoice.payment_failed': { from: ['itemized', 'invoiced'], to: 'failed' },
  // Off-session no hay nadie para autenticar (3DS): a efectos de cobro es un fallo.
  'invoice.payment_action_required': { from: ['itemized', 'invoiced'], to: 'failed' },
  'invoice.marked_uncollectible': { from: ['itemized', 'invoiced'], to: 'failed' },
  // Anular la factura es decisión de soporte (condonar): deja de ser deuda.
  'invoice.voided': { from: ['itemized', 'invoiced', 'failed'], to: 'void' },
};

/** Resultado de aplicar una factura a las comisiones. */
export interface CommissionInvoiceResult {
  providerId: string;
  /** Alguna comisión cambió de estado o la deuda cambió. */
  changed: boolean;
  /** Clave del aviso de impago, solo si hay comisiones que acaban de fallar. */
  paymentFailedKey?: string;
}

/**
 * Aplica un evento de factura a las comisiones del pago en el local que
 * contiene (sean de la factura mensual suelta o de una renovación del plan).
 *
 *  - `payment_failed` (o 3DS / incobrable): comisiones `failed` y, si es la
 *    primera, `commissionDebtSince` → se suspende el pago en el local para
 *    reservas nuevas (§4.bis, impago).
 *  - `paid` / `voided`: si ya no queda ninguna comisión `failed`, se limpia
 *    la deuda y el pago en el local vuelve (si el negocio lo tiene activado).
 *
 * Transacción con la fila de facturación bloqueada: dos facturas del mismo
 * negocio procesadas a la vez no pueden dejar la deuda limpia por error.
 * Idempotente: una reentrega no cambia filas ni repite el aviso.
 *
 * @returns `null` si la factura no lleva comisiones nuestras.
 */
export async function applyCommissionInvoiceEvent(
  type: CommissionInvoiceEventType,
  invoice: Stripe.Invoice,
  at: Date,
): Promise<CommissionInvoiceResult | null> {
  if (!invoice.id) return null;
  const itemIds = await invoiceItemIdsOf(invoice);
  if (itemIds.length === 0) return null;
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const billing = customerId ? await billingRepository.findByCustomerId(customerId) : null;
  if (!billing) return null;

  const { providerId } = billing;
  const transition = TRANSITIONS[type];
  const invoiceId = invoice.id;
  const outcome = await prisma.$transaction(async (tx) => {
    const row = await commissionRepository.lockBilling(tx, providerId);
    const moved = await commissionRepository.transitionCharges(tx, providerId, itemIds, {
      ...transition,
      stripeInvoiceId: invoiceId,
      at,
    });
    let debtChanged = false;
    if (transition.to === 'failed' && moved > 0 && !row?.commissionDebtSince) {
      await commissionRepository.setCommissionDebt(tx, providerId, at);
      debtChanged = true;
    }
    if ((transition.to === 'paid' || transition.to === 'void') && row?.commissionDebtSince) {
      if ((await commissionRepository.countFailedCharges(tx, providerId)) === 0) {
        await commissionRepository.setCommissionDebt(tx, providerId, null);
        debtChanged = true;
      }
    }
    return { moved, debtChanged };
  });

  const notify =
    transition.to === 'failed' && outcome.moved > 0 && type !== 'invoice.marked_uncollectible';
  return {
    providerId,
    changed: outcome.moved > 0 || outcome.debtChanged,
    ...(notify ? { paymentFailedKey: `${invoiceId}:${invoice.attempt_count}` } : {}),
  };
}

/**
 * Conceptos (invoice items) de la factura. En la API dahlia la línea
 * apunta a su concepto en `parent.invoice_item_details.invoice_item`. El
 * objeto del evento trae solo la primera página de líneas: si hay más,
 * se pide la lista completa.
 */
async function invoiceItemIdsOf(invoice: Stripe.Invoice): Promise<string[]> {
  let lines = invoice.lines?.data ?? [];
  if (invoice.lines?.has_more && invoice.id) {
    lines = await getStripeClient()
      .invoices.listLineItems(invoice.id, { limit: 100 })
      .autoPagingToArray({ limit: 1000 });
  }
  const ids = new Set<string>();
  for (const line of lines) {
    const itemId = line.parent?.invoice_item_details?.invoice_item;
    if (line.parent?.type === 'invoice_item_details' && itemId) ids.add(itemId);
  }
  return [...ids];
}
