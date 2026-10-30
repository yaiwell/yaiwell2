/**
 * Tests de `invoiceCommissionsBeforePlan`: solo factura si el Customer
 * tiene conceptos pendientes en Stripe, con clave por negocio y minuto, y
 * bloquea el Checkout del plan si no puede separarlos.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listItems: vi.fn(),
  create: vi.fn(),
  finalize: vi.fn(),
  del: vi.fn(),
  findProvider: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({
    invoiceItems: { list: mocks.listItems },
    invoices: { create: mocks.create, finalizeInvoice: mocks.finalize, del: mocks.del },
  }),
}));
vi.mock('./billing.repository', () => ({
  billingRepository: { findProviderForBilling: mocks.findProvider },
}));
vi.mock('./billing.report', () => ({ reportBillingIssue: mocks.report }));

import { invoiceCommissionsBeforePlan } from './billing.commission.pre-plan';
import { BillingStripeError } from './billing.errors';

const NOW = new Date('2026-11-05T10:00:30Z');
const MINUTE = Math.floor(NOW.getTime() / 60_000);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listItems.mockResolvedValue({ data: [{ id: 'ii_1' }] });
  mocks.findProvider.mockResolvedValue({ id: 'prov-aura', ownerLocale: 'de' });
  mocks.create.mockResolvedValue({ id: 'in_p', status: 'draft', lines: { data: [{ id: 'il' }] } });
  mocks.finalize.mockResolvedValue({ id: 'in_p', status: 'open' });
});

describe('invoiceCommissionsBeforePlan', () => {
  it('sin conceptos pendientes no crea nada', async () => {
    mocks.listItems.mockResolvedValue({ data: [] });
    await expect(invoiceCommissionsBeforePlan('prov-aura', 'cus_aura', NOW)).resolves.toBe('none');
    expect(mocks.listItems).toHaveBeenCalledWith({ customer: 'cus_aura', pending: true, limit: 1 });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('factura y finaliza las pendientes con clave pre-plan por minuto', async () => {
    await expect(invoiceCommissionsBeforePlan('prov-aura', 'cus_aura', NOW)).resolves.toBe(
      'invoiced',
    );
    const [params, options] = mocks.create.mock.calls[0];
    expect(params).toMatchObject({
      customer: 'cus_aura',
      pending_invoice_items_behavior: 'include',
      collection_method: 'charge_automatically',
      metadata: { kind: 'onsite_commission_invoice', providerId: 'prov-aura' },
    });
    expect(params.description).toContain('Provisionen');
    expect(options.idempotencyKey).toBe(`onsite-commission-invoice:prov-aura:pre-plan:${MINUTE}`);
    expect(mocks.finalize).toHaveBeenCalledWith('in_p', { auto_advance: true }, expect.anything());
  });

  it('un borrador vacío (ya facturadas en otro intento) se borra', async () => {
    mocks.create.mockResolvedValue({ id: 'in_p', status: 'draft', lines: { data: [] } });
    await expect(invoiceCommissionsBeforePlan('prov-aura', 'cus_aura', NOW)).resolves.toBe('empty');
    expect(mocks.del).toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it('si no puede crear la factura, lanza BillingStripeError (no se abre el Checkout)', async () => {
    mocks.create.mockRejectedValue(new Error('down'));
    await expect(invoiceCommissionsBeforePlan('prov-aura', 'cus_aura', NOW)).rejects.toBeInstanceOf(
      BillingStripeError,
    );
  });

  it('si no puede comprobar los pendientes, también lanza', async () => {
    mocks.listItems.mockRejectedValue(new Error('down'));
    await expect(invoiceCommissionsBeforePlan('prov-aura', 'cus_aura', NOW)).rejects.toBeInstanceOf(
      BillingStripeError,
    );
  });
});
