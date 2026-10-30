/**
 * Tests de `applyCommissionInvoiceEvent`: localización de las comisiones
 * por las líneas de la factura (API dahlia), transiciones solo hacia
 * delante, deuda que suspende el pago en el local y que se limpia al
 * pagar, y aviso solo en la transición real.
 */
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listLineItems: vi.fn(),
  findByCustomerId: vi.fn(),
  lockBilling: vi.fn(),
  transition: vi.fn(),
  countFailed: vi.fn(),
  setDebt: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn({ tx: true }) },
}));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({
    invoices: {
      listLineItems: (...args: unknown[]) => ({
        autoPagingToArray: () => mocks.listLineItems(...args),
      }),
    },
  }),
}));
vi.mock('./billing.repository', () => ({
  billingRepository: { findByCustomerId: mocks.findByCustomerId },
}));
vi.mock('./billing.commission.repository', () => ({
  commissionRepository: {
    lockBilling: mocks.lockBilling,
    transitionCharges: mocks.transition,
    countFailedCharges: mocks.countFailed,
    setCommissionDebt: mocks.setDebt,
  },
}));

import { applyCommissionInvoiceEvent } from './billing.commission.webhook';

const AT = new Date('2026-11-02T08:00:00Z');

function itemLine(itemId: string) {
  return {
    id: `il_${itemId}`,
    parent: {
      type: 'invoice_item_details',
      invoice_item_details: { invoice_item: itemId },
      subscription_item_details: null,
    },
  };
}

function invoice(lines: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    id: 'in_1',
    customer: 'cus_aura',
    attempt_count: 1,
    lines: { data: lines, has_more: false },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

const subscriptionLine = {
  id: 'il_sub',
  parent: {
    type: 'subscription_item_details',
    invoice_item_details: null,
    subscription_item_details: { subscription_item: 'si_1' },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findByCustomerId.mockResolvedValue({ providerId: 'prov-aura' });
  mocks.lockBilling.mockResolvedValue({ commissionDebtSince: null });
  mocks.transition.mockResolvedValue(2);
  mocks.countFailed.mockResolvedValue(0);
});

describe('applyCommissionInvoiceEvent', () => {
  it('ignora facturas sin conceptos de comisión (cuota del plan)', async () => {
    const result = await applyCommissionInvoiceEvent(
      'invoice.paid',
      invoice([subscriptionLine]),
      AT,
    );
    expect(result).toBeNull();
    expect(mocks.findByCustomerId).not.toHaveBeenCalled();
  });

  it('finalized: itemized → invoiced con la factura', async () => {
    const result = await applyCommissionInvoiceEvent(
      'invoice.finalized',
      invoice([itemLine('ii_1'), itemLine('ii_2'), subscriptionLine]),
      AT,
    );
    expect(mocks.transition).toHaveBeenCalledWith({ tx: true }, 'prov-aura', ['ii_1', 'ii_2'], {
      from: ['itemized'],
      to: 'invoiced',
      stripeInvoiceId: 'in_1',
      at: AT,
    });
    expect(result).toEqual({ providerId: 'prov-aura', changed: true });
    expect(mocks.setDebt).not.toHaveBeenCalled();
  });

  it('payment_failed: comisiones failed, deuda desde ahora y aviso por intento', async () => {
    const result = await applyCommissionInvoiceEvent(
      'invoice.payment_failed',
      invoice([itemLine('ii_1')], { attempt_count: 2 }),
      AT,
    );
    expect(mocks.transition.mock.calls[0][3]).toMatchObject({
      from: ['itemized', 'invoiced'],
      to: 'failed',
    });
    expect(mocks.setDebt).toHaveBeenCalledWith({ tx: true }, 'prov-aura', AT);
    expect(result).toEqual({
      providerId: 'prov-aura',
      changed: true,
      paymentFailedKey: 'in_1:2',
    });
  });

  it('una reentrega del fallo no mueve filas ni vuelve a avisar', async () => {
    mocks.transition.mockResolvedValue(0);
    mocks.lockBilling.mockResolvedValue({ commissionDebtSince: new Date('2026-11-01') });

    const result = await applyCommissionInvoiceEvent(
      'invoice.payment_failed',
      invoice([itemLine('ii_1')]),
      AT,
    );
    expect(result).toEqual({ providerId: 'prov-aura', changed: false });
    expect(mocks.setDebt).not.toHaveBeenCalled();
  });

  it('con deuda previa no la mueve de fecha (cuenta desde el primer fallo)', async () => {
    mocks.lockBilling.mockResolvedValue({ commissionDebtSince: new Date('2026-10-01') });
    await applyCommissionInvoiceEvent('invoice.payment_failed', invoice([itemLine('ii_9')]), AT);
    expect(mocks.setDebt).not.toHaveBeenCalled();
  });

  it('paid: limpia la deuda si no queda ninguna comisión fallida', async () => {
    mocks.lockBilling.mockResolvedValue({ commissionDebtSince: new Date('2026-11-01') });

    const result = await applyCommissionInvoiceEvent(
      'invoice.paid',
      invoice([itemLine('ii_1')]),
      AT,
    );

    expect(mocks.transition.mock.calls[0][3]).toMatchObject({
      from: ['itemized', 'invoiced', 'failed'],
      to: 'paid',
    });
    expect(mocks.setDebt).toHaveBeenCalledWith({ tx: true }, 'prov-aura', null);
    expect(result?.changed).toBe(true);
  });

  it('paid: mantiene la deuda si otra factura sigue impagada', async () => {
    mocks.lockBilling.mockResolvedValue({ commissionDebtSince: new Date('2026-11-01') });
    mocks.countFailed.mockResolvedValue(1);

    await applyCommissionInvoiceEvent('invoice.paid', invoice([itemLine('ii_1')]), AT);
    expect(mocks.setDebt).not.toHaveBeenCalled();
  });

  it('voided (condonada por soporte) también puede limpiar la deuda', async () => {
    mocks.lockBilling.mockResolvedValue({ commissionDebtSince: new Date('2026-11-01') });
    await applyCommissionInvoiceEvent('invoice.voided', invoice([itemLine('ii_1')]), AT);
    expect(mocks.transition.mock.calls[0][3].to).toBe('void');
    expect(mocks.setDebt).toHaveBeenCalledWith({ tx: true }, 'prov-aura', null);
  });

  it('marked_uncollectible deja deuda pero no repite el aviso', async () => {
    const result = await applyCommissionInvoiceEvent(
      'invoice.marked_uncollectible',
      invoice([itemLine('ii_1')]),
      AT,
    );
    expect(mocks.setDebt).toHaveBeenCalledWith({ tx: true }, 'prov-aura', AT);
    expect(result).not.toHaveProperty('paymentFailedKey');
  });

  it('pide todas las líneas si la factura del evento viene paginada', async () => {
    mocks.listLineItems.mockResolvedValue([itemLine('ii_1'), itemLine('ii_2')]);
    await applyCommissionInvoiceEvent(
      'invoice.finalized',
      invoice([subscriptionLine], { lines: { data: [subscriptionLine], has_more: true } }),
      AT,
    );
    expect(mocks.listLineItems).toHaveBeenCalledWith('in_1', { limit: 100 });
    expect(mocks.transition.mock.calls[0][2]).toEqual(['ii_1', 'ii_2']);
  });

  it('un Customer que no es de ningún negocio no se procesa', async () => {
    mocks.findByCustomerId.mockResolvedValue(null);
    await expect(
      applyCommissionInvoiceEvent('invoice.paid', invoice([itemLine('ii_1')]), AT),
    ).resolves.toBeNull();
    expect(mocks.transition).not.toHaveBeenCalled();
  });
});
