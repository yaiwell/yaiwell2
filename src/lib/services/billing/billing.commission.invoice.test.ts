/**
 * Tests de la factura mensual suelta de comisiones y del barrido diario:
 * clave por negocio y mes de Madrid, borrador vacío borrado, periodo
 * apuntado antes de finalizar, orden del barrido y presupuesto de tiempo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  finalize: vi.fn(),
  del: vi.fn(),
  findProviders: vi.fn(),
  markPeriod: vi.fn(),
  findPending: vi.fn(),
  itemize: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({
    invoices: { create: mocks.create, finalizeInvoice: mocks.finalize, del: mocks.del },
  }),
}));
vi.mock('./billing.commission.repository', () => ({
  commissionRepository: {
    findProvidersToInvoice: mocks.findProviders,
    markInvoicePeriod: mocks.markPeriod,
    findPendingChargeIds: mocks.findPending,
  },
}));
vi.mock('./billing.commission.itemize', () => ({ itemizeCommissionAt: mocks.itemize }));
vi.mock('./billing.report', () => ({ reportBillingIssue: mocks.report }));

import { invoiceProviderCommissions } from './billing.commission.invoice';
import { getMadridPeriod, getMadridPeriodStart } from './billing.commission.period';
import { runCommissionSweep } from './billing.commission.sweep';

// 1 de noviembre, 00:30 en Madrid (31 de octubre, 23:30 UTC).
const NOW = new Date('2026-10-31T23:30:00Z');
const TARGET = {
  providerId: 'prov-aura',
  stripeCustomerId: 'cus_aura',
  provider: { owner: { locale: 'es' as const } },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({
    id: 'in_1',
    status: 'draft',
    lines: { data: [{ id: 'il_1' }] },
  });
  mocks.finalize.mockResolvedValue({ id: 'in_1', status: 'open' });
  mocks.findProviders.mockResolvedValue([TARGET]);
  mocks.findPending.mockResolvedValue([]);
  mocks.itemize.mockResolvedValue('itemized');
});

describe('periodo de Madrid', () => {
  it('usa el mes civil de Madrid, no el de UTC', () => {
    expect(getMadridPeriod(NOW)).toBe('2026-11');
    expect(getMadridPeriodStart(NOW).toISOString()).toBe('2026-10-31T23:00:00.000Z');
  });
});

describe('invoiceProviderCommissions', () => {
  it('crea la factura con los conceptos pendientes y clave por negocio y mes', async () => {
    await expect(invoiceProviderCommissions(TARGET, NOW)).resolves.toBe('invoiced');

    const [params, options] = mocks.create.mock.calls[0];
    expect(params).toMatchObject({
      customer: 'cus_aura',
      collection_method: 'charge_automatically',
      pending_invoice_items_behavior: 'include',
      auto_advance: true,
      metadata: { kind: 'onsite_commission_invoice', providerId: 'prov-aura', period: '2026-11' },
    });
    expect(options.idempotencyKey).toBe('onsite-commission-invoice:prov-aura:2026-11');
    expect(mocks.markPeriod).toHaveBeenCalledWith('prov-aura', '2026-11');
    expect(mocks.finalize).toHaveBeenCalledWith('in_1', { auto_advance: true }, expect.anything());
    // El periodo se apunta antes de finalizar.
    expect(mocks.markPeriod.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.finalize.mock.invocationCallOrder[0],
    );
  });

  it('borra el borrador vacío y apunta el periodo para no repetirlo', async () => {
    mocks.create.mockResolvedValue({ id: 'in_1', status: 'draft', lines: { data: [] } });

    await expect(invoiceProviderCommissions(TARGET, NOW)).resolves.toBe('empty');

    expect(mocks.del).toHaveBeenCalledWith('in_1', {}, expect.anything());
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(mocks.markPeriod).toHaveBeenCalledWith('prov-aura', '2026-11');
  });

  it('un borrador ya borrado (reintento con la misma clave) no es un error', async () => {
    mocks.create.mockResolvedValue({ id: 'in_1', status: 'draft', lines: { data: [] } });
    mocks.del.mockRejectedValue(
      Object.assign(new Error('No such invoice'), { code: 'resource_missing' }),
    );

    await expect(invoiceProviderCommissions(TARGET, NOW)).resolves.toBe('empty');
    expect(mocks.report).not.toHaveBeenCalled();
  });

  it('si la creación falla no apunta el periodo (se reintenta mañana)', async () => {
    mocks.create.mockRejectedValue(new Error('stripe down'));

    await expect(invoiceProviderCommissions(TARGET, NOW)).resolves.toBe('failed');
    expect(mocks.markPeriod).not.toHaveBeenCalled();
  });

  it('si finalizar falla cuenta como emitida (auto_advance la finaliza)', async () => {
    mocks.finalize.mockRejectedValue(new Error('stripe down'));

    await expect(invoiceProviderCommissions(TARGET, NOW)).resolves.toBe('invoiced');
    expect(mocks.markPeriod).toHaveBeenCalled();
  });
});

describe('runCommissionSweep', () => {
  it('itemiza primero las nuevas, luego las atrasadas, y después factura', async () => {
    mocks.findPending.mockResolvedValue(['old-1']);
    mocks.itemize.mockResolvedValueOnce('itemized').mockResolvedValueOnce('retry_later');

    const summary = await runCommissionSweep({
      now: NOW,
      deadline: Date.now() + 60_000,
      freshChargeIds: ['new-1'],
    });

    expect(mocks.findPending).toHaveBeenCalledWith(expect.any(Number), ['new-1']);
    expect(mocks.itemize.mock.calls.map((call) => call[0])).toEqual(['new-1', 'old-1']);
    expect(mocks.findProviders).toHaveBeenCalledWith('2026-11', getMadridPeriodStart(NOW), 25);
    expect(summary).toEqual({
      itemized: 1,
      retryLater: 1,
      invoiced: 1,
      emptyInvoices: 0,
      invoiceFailures: 0,
      truncated: false,
    });
  });

  it('sin tiempo no empieza nada y lo marca como truncado', async () => {
    const summary = await runCommissionSweep({
      now: NOW,
      deadline: Date.now() - 1,
      freshChargeIds: ['new-1'],
    });

    expect(mocks.itemize).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(summary.truncated).toBe(true);
  });

  it('un fallo de BD en una comisión no corta el barrido', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.itemize.mockRejectedValueOnce(new Error('db')).mockResolvedValueOnce('itemized');

    const summary = await runCommissionSweep({
      now: NOW,
      deadline: Date.now() + 60_000,
      freshChargeIds: ['a', 'b'],
    });

    expect(summary.retryLater).toBe(1);
    expect(summary.itemized).toBe(1);
  });
});
