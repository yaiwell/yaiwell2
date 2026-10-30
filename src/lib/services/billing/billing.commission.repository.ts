import 'server-only';

import type { OnsiteCommissionStatus, Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';

import { LIVE_SUBSCRIPTION_STATUSES } from './billing.types';

/** Longitud máxima del error guardado en la fila (va a soporte, no al usuario). */
const LAST_ERROR_MAX_LENGTH = 500;

/** Cambio de estado de las comisiones de una factura (webhook). */
export interface CommissionInvoiceTransition {
  /** Estados desde los que se permite el paso (nunca se retrocede). */
  from: OnsiteCommissionStatus[];
  to: OnsiteCommissionStatus;
  stripeInvoiceId: string;
  at: Date;
}

/**
 * Repositorio de `onsite_commission_charges` y de las columnas del pago en
 * el local de `provider_billing` / `providers`. Sin reglas de negocio.
 */
export const commissionRepository = {
  /** Fila con lo que necesita el concepto de Stripe (importe y descripción). */
  async findChargeForItemize(chargeId: string) {
    return prisma.onsiteCommissionCharge.findUnique({
      where: { id: chargeId },
      select: {
        id: true,
        bookingId: true,
        providerId: true,
        amountCents: true,
        status: true,
        createdAt: true,
        booking: { select: { startAt: true, service: { select: { name: true } } } },
        provider: { select: { owner: { select: { locale: true } } } },
      },
    });
  },

  /**
   * `pending` → `itemized` de forma condicional: si otro camino (la action
   * y el cron a la vez) se adelantó, 0 filas y no se pisa nada.
   */
  async markItemized(chargeId: string, invoiceItemId: string, at: Date): Promise<boolean> {
    const { count } = await prisma.onsiteCommissionCharge.updateMany({
      where: { id: chargeId, status: 'pending' },
      data: {
        status: 'itemized',
        stripeInvoiceItemId: invoiceItemId,
        itemizedAt: at,
        lastError: null,
        lastErrorAt: null,
      },
    });
    return count > 0;
  },

  /** Comisión de 0 €: no hay nada que cobrar, se da por saldada. */
  async markNothingToCharge(chargeId: string, at: Date): Promise<boolean> {
    const { count } = await prisma.onsiteCommissionCharge.updateMany({
      where: { id: chargeId, status: 'pending' },
      data: { status: 'paid', paidAt: at },
    });
    return count > 0;
  },

  /** Deja el error en la fila (sigue `pending`: la reintenta el cron). */
  async recordItemizeError(chargeId: string, message: string, at: Date): Promise<void> {
    await prisma.onsiteCommissionCharge.updateMany({
      where: { id: chargeId, status: 'pending' },
      data: { lastError: message.slice(0, LAST_ERROR_MAX_LENGTH), lastErrorAt: at },
    });
  },

  /** Comisiones aún sin pasar a Stripe, de la más antigua a la más nueva. */
  async findPendingChargeIds(limit: number, excludeIds: string[]): Promise<string[]> {
    const rows = await prisma.onsiteCommissionCharge.findMany({
      where: { status: 'pending', ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  },

  /**
   * Negocios a los que toca emitir la factura suelta del mes: sin
   * suscripción viva (con ella los conceptos entran solos en su factura),
   * sin factura de este periodo y con comisiones ya en Stripe de un mes
   * anterior.
   */
  async findProvidersToInvoice(period: string, periodStart: Date, limit: number) {
    const live = [...LIVE_SUBSCRIPTION_STATUSES];
    return prisma.providerBilling.findMany({
      where: {
        // `notIn` descarta los NULL en SQL: el OR los recupera.
        AND: [
          { OR: [{ subscriptionStatus: null }, { subscriptionStatus: { notIn: live } }] },
          {
            OR: [
              { lastCommissionInvoicePeriod: null },
              { lastCommissionInvoicePeriod: { lt: period } },
            ],
          },
        ],
        provider: {
          onsiteCommissions: { some: { status: 'itemized', itemizedAt: { lt: periodStart } } },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        providerId: true,
        stripeCustomerId: true,
        provider: { select: { owner: { select: { locale: true } } } },
      },
    });
  },

  /** Apunta que la factura del periodo ya está emitida (o no hacía falta). */
  async markInvoicePeriod(providerId: string, period: string): Promise<void> {
    await prisma.providerBilling.updateMany({
      where: {
        providerId,
        OR: [
          { lastCommissionInvoicePeriod: null },
          { lastCommissionInvoicePeriod: { lt: period } },
        ],
      },
      data: { lastCommissionInvoicePeriod: period },
    });
  },

  /**
   * Bloquea la fila de facturación del negocio hasta el fin de la
   * transacción: serializa los webhooks de facturas de comisión para que
   * fijar y limpiar la deuda no se crucen.
   */
  async lockBilling(tx: Prisma.TransactionClient, providerId: string) {
    await tx.$queryRaw`
      SELECT id FROM provider_billing WHERE "providerId" = ${providerId} FOR UPDATE
    `;
    return tx.providerBilling.findUnique({
      where: { providerId },
      select: { commissionDebtSince: true },
    });
  },

  /** Aplica un cambio de estado a las comisiones de los conceptos dados. */
  async transitionCharges(
    tx: Prisma.TransactionClient,
    providerId: string,
    invoiceItemIds: string[],
    transition: CommissionInvoiceTransition,
  ): Promise<number> {
    const { from, to, stripeInvoiceId, at } = transition;
    const { count } = await tx.onsiteCommissionCharge.updateMany({
      where: { providerId, stripeInvoiceItemId: { in: invoiceItemIds }, status: { in: from } },
      data: {
        status: to,
        stripeInvoiceId,
        ...(to === 'invoiced' ? { invoicedAt: at } : {}),
        ...(to === 'paid' ? { paidAt: at } : {}),
        ...(to === 'failed' ? { lastErrorAt: at, lastError: 'invoice_payment_failed' } : {}),
      },
    });
    return count;
  },

  async countFailedCharges(tx: Prisma.TransactionClient, providerId: string): Promise<number> {
    return tx.onsiteCommissionCharge.count({ where: { providerId, status: 'failed' } });
  },

  /** Facturas de Stripe con comisiones del negocio aún sin cobrar. */
  async findUnpaidCommissionInvoiceIds(providerId: string): Promise<string[]> {
    const rows = await prisma.onsiteCommissionCharge.findMany({
      where: { providerId, status: { in: ['failed', 'invoiced'] }, stripeInvoiceId: { not: null } },
      distinct: ['stripeInvoiceId'],
      select: { stripeInvoiceId: true },
    });
    return rows.flatMap((row) => (row.stripeInvoiceId ? [row.stripeInvoiceId] : []));
  },

  async setCommissionDebt(tx: Prisma.TransactionClient, providerId: string, since: Date | null) {
    await tx.providerBilling.update({
      where: { providerId },
      data: { commissionDebtSince: since },
    });
  },

  /** Método de pago para comisiones guardado (Checkout `mode: 'setup'`). */
  async markPaymentMethodReady(providerId: string, at: Date): Promise<void> {
    await prisma.providerBilling.update({
      where: { providerId },
      data: { onsitePaymentMethodReadyAt: at },
    });
  },

  /** El Customer se ha quedado sin método por defecto: ya no está listo. */
  async clearPaymentMethodReady(providerId: string): Promise<boolean> {
    const { count } = await prisma.providerBilling.updateMany({
      where: { providerId, onsitePaymentMethodReadyAt: { not: null } },
      data: { onsitePaymentMethodReadyAt: null },
    });
    return count > 0;
  },

  /**
   * Activa el pago en el local solo si, en el mismo `UPDATE`, el negocio
   * tiene método de pago y no debe comisiones: un impago que llegue a la
   * vez no se cuela.
   */
  async enableOnsitePayment(providerId: string): Promise<boolean> {
    const { count } = await prisma.provider.updateMany({
      where: {
        id: providerId,
        deletedAt: null,
        billing: { is: { onsitePaymentMethodReadyAt: { not: null }, commissionDebtSince: null } },
      },
      data: { acceptsOnsitePayment: true },
    });
    return count > 0;
  },

  async disableOnsitePayment(providerId: string): Promise<boolean> {
    const { count } = await prisma.provider.updateMany({
      where: { id: providerId, deletedAt: null },
      data: { acceptsOnsitePayment: false },
    });
    return count > 0;
  },

  /** Datos de la tarjeta «Cobro en el local» del panel. */
  async findOnsiteSummaryRows(providerId: string) {
    const [provider, totals] = await Promise.all([
      prisma.provider.findFirst({
        where: { id: providerId, deletedAt: null },
        select: {
          acceptsOnsitePayment: true,
          billing: { select: { onsitePaymentMethodReadyAt: true, commissionDebtSince: true } },
        },
      }),
      prisma.onsiteCommissionCharge.groupBy({
        by: ['status'],
        where: { providerId, status: { in: ['pending', 'itemized', 'invoiced', 'failed'] } },
        _sum: { amountCents: true },
      }),
    ]);
    return { provider, totals };
  },
};
