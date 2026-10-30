/**
 * Tests de `settleCommissionDebt`: cobra con el método nuevo las facturas
 * de comisiones sin cobrar, aplica el `paid` en el acto y nunca lanza.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pay: vi.fn(),
  findUnpaid: vi.fn(),
  apply: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({ invoices: { pay: mocks.pay } }),
}));
vi.mock('./billing.commission.repository', () => ({
  commissionRepository: { findUnpaidCommissionInvoiceIds: mocks.findUnpaid },
}));
vi.mock('./billing.commission.webhook', () => ({ applyCommissionInvoiceEvent: mocks.apply }));
vi.mock('./billing.report', () => ({ reportBillingIssue: mocks.report }));

import { settleCommissionDebt } from './billing.commission.settle';

const NOW = new Date('2026-11-05T10:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUnpaid.mockResolvedValue(['in_1', 'in_2']);
  mocks.pay.mockImplementation(async (id: string) => ({ id, status: 'paid', lines: { data: [] } }));
  mocks.apply.mockResolvedValue({ providerId: 'prov-aura', changed: true });
});

describe('settleCommissionDebt', () => {
  it('cobra cada factura con el método nuevo y clave por factura y método', async () => {
    const result = await settleCommissionDebt('prov-aura', 'pm_new', NOW);

    expect(mocks.pay).toHaveBeenCalledWith(
      'in_1',
      { payment_method: 'pm_new' },
      expect.objectContaining({ idempotencyKey: 'onsite-commission-pay:in_1:pm_new' }),
    );
    expect(mocks.apply).toHaveBeenCalledWith(
      'invoice.paid',
      expect.objectContaining({ id: 'in_2' }),
      NOW,
    );
    expect(result).toEqual({ attempted: 2, paid: 2 });
  });

  it('si un cobro falla, sigue con el resto y no lanza', async () => {
    mocks.pay.mockRejectedValueOnce(new Error('card_declined'));

    const result = await settleCommissionDebt('prov-aura', 'pm_new', NOW);

    expect(result).toEqual({ attempted: 2, paid: 1 });
    expect(mocks.apply).toHaveBeenCalledTimes(1);
    expect(mocks.report).toHaveBeenCalled();
  });

  it('una factura que no queda pagada (pendiente de 3DS) no se marca', async () => {
    mocks.pay.mockResolvedValue({ id: 'in_1', status: 'open' });
    const result = await settleCommissionDebt('prov-aura', 'pm_new', NOW);
    expect(result.paid).toBe(0);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('sin facturas pendientes no llama a Stripe', async () => {
    mocks.findUnpaid.mockResolvedValue([]);
    await expect(settleCommissionDebt('prov-aura', 'pm_new', NOW)).resolves.toEqual({
      attempted: 0,
      paid: 0,
    });
    expect(mocks.pay).not.toHaveBeenCalled();
  });

  it('un fallo de BD al listar no lanza', async () => {
    mocks.findUnpaid.mockRejectedValue(new Error('db down'));
    await expect(settleCommissionDebt('prov-aura', 'pm_new', NOW)).resolves.toEqual({
      attempted: 0,
      paid: 0,
    });
  });
});
