/**
 * Tests de `itemizeCommission`: concepto con IVA inclusivo y clave de
 * idempotencia por reserva, escritura condicional, fallo de Stripe que
 * deja la fila en `pending` y adopción de un concepto ya creado fuera de
 * la ventana de idempotencia (sin cobrar dos veces).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  findCharge: vi.fn(),
  markItemized: vi.fn(),
  markNothing: vi.fn(),
  recordError: vi.fn(),
  ensureCustomer: vi.fn(),
  vat: vi.fn(),
  report: vi.fn(),
  openCheckout: vi.fn(),
  reconcile: vi.fn(),
}));
vi.mock('./billing.checkout-sessions', () => ({ hasOpenPlanCheckout: mocks.openCheckout }));
vi.mock('./billing.commission.reconcile', () => ({ reconcileItemInvoice: mocks.reconcile }));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({
    invoiceItems: {
      create: mocks.create,
      list: (...args: unknown[]) => ({ autoPagingToArray: () => mocks.list(...args) }),
    },
  }),
}));
vi.mock('./billing.commission.repository', () => ({
  commissionRepository: {
    findChargeForItemize: mocks.findCharge,
    markItemized: mocks.markItemized,
    markNothingToCharge: mocks.markNothing,
    recordItemizeError: mocks.recordError,
  },
}));
vi.mock('./billing.customer', () => ({ ensureBillingCustomer: mocks.ensureCustomer }));
vi.mock('./billing.tax', () => ({ resolveVatTaxRate: mocks.vat }));
vi.mock('./billing.report', () => ({ reportBillingIssue: mocks.report }));

import { itemizeCommissionAt, PLAN_CHECKOUT_OPEN } from './billing.commission.itemize';

const CREATED = new Date('2026-10-30T10:00:00Z');
const NOW = new Date('2026-10-30T12:00:00Z');

function charge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'charge-1',
    bookingId: 'bk-1',
    providerId: 'prov-aura',
    amountCents: 360,
    status: 'pending',
    createdAt: CREATED,
    booking: {
      startAt: new Date('2026-10-28T16:00:00Z'),
      service: { name: { es: 'Corte de pelo', en: 'Haircut' } },
    },
    provider: { owner: { locale: 'es' } },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findCharge.mockResolvedValue(charge());
  mocks.ensureCustomer.mockResolvedValue('cus_aura');
  mocks.vat.mockResolvedValue('txr_iva');
  mocks.create.mockResolvedValue({ id: 'ii_1' });
  mocks.markItemized.mockResolvedValue(true);
  mocks.list.mockResolvedValue([]);
  mocks.openCheckout.mockResolvedValue(false);
});

describe('itemizeCommissionAt', () => {
  it('crea el concepto con IVA, metadata y clave por reserva', async () => {
    await expect(itemizeCommissionAt('charge-1', NOW)).resolves.toBe('itemized');

    const [params, options] = mocks.create.mock.calls[0];
    expect(params).toMatchObject({
      customer: 'cus_aura',
      amount: 360,
      currency: 'eur',
      tax_rates: ['txr_iva'],
      metadata: { kind: 'onsite_commission', bookingId: 'bk-1', providerId: 'prov-aura' },
    });
    expect(params).not.toHaveProperty('subscription');
    expect(params.description).toContain('Corte de pelo');
    expect(params.description).toContain('28/10/2026');
    expect(options.idempotencyKey).toBe('onsite-commission:bk-1');
    expect(mocks.markItemized).toHaveBeenCalledWith('charge-1', 'ii_1', NOW);
  });

  it('describe el concepto en el idioma del dueño', async () => {
    mocks.findCharge.mockResolvedValue(charge({ provider: { owner: { locale: 'en' } } }));
    await itemizeCommissionAt('charge-1', NOW);
    expect(mocks.create.mock.calls[0][0].description).toContain('Haircut');
  });

  it('no hace nada si la fila ya no está pending', async () => {
    mocks.findCharge.mockResolvedValue(charge({ status: 'itemized' }));
    await expect(itemizeCommissionAt('charge-1', NOW)).resolves.toBe('already_itemized');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('una comisión de 0 € no va a Stripe', async () => {
    mocks.findCharge.mockResolvedValue(charge({ amountCents: 0 }));
    await itemizeCommissionAt('charge-1', NOW);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.markNothing).toHaveBeenCalledWith('charge-1', NOW);
  });

  it('si Stripe falla, deja el error y la fila pending (la reintenta el cron)', async () => {
    mocks.create.mockRejectedValue(
      Object.assign(new Error('Rate limit'), { type: 'StripeRateLimitError', code: 'rate_limit' }),
    );
    await expect(itemizeCommissionAt('charge-1', NOW)).resolves.toBe('retry_later');
    expect(mocks.recordError).toHaveBeenCalledWith(
      'charge-1',
      expect.stringContaining('rate_limit'),
      NOW,
    );
    expect(mocks.markItemized).not.toHaveBeenCalled();
    expect(mocks.report).toHaveBeenCalled();
  });

  it('si otro camino se adelantó al guardar, devuelve already_itemized', async () => {
    mocks.markItemized.mockResolvedValue(false);
    await expect(itemizeCommissionAt('charge-1', NOW)).resolves.toBe('already_itemized');
  });

  it('dentro de la ventana de idempotencia no busca conceptos previos', async () => {
    await itemizeCommissionAt('charge-1', NOW);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('fuera de la ventana adopta el concepto ya creado en vez de duplicarlo', async () => {
    const later = new Date(CREATED.getTime() + 30 * 60 * 60 * 1000);
    mocks.list.mockResolvedValue([
      { id: 'ii_other', metadata: { kind: 'onsite_commission', bookingId: 'bk-2' } },
      { id: 'ii_old', metadata: { kind: 'onsite_commission', bookingId: 'bk-1' } },
    ]);

    await expect(itemizeCommissionAt('charge-1', later)).resolves.toBe('itemized');

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.markItemized).toHaveBeenCalledWith('charge-1', 'ii_old', later);
    expect(mocks.list.mock.calls[0][0]).toMatchObject({
      customer: 'cus_aura',
      created: { gte: Math.floor(CREATED.getTime() / 1000) },
    });
  });

  it('con un Checkout de plan abierto lo aplaza (sigue pending, sin Sentry)', async () => {
    mocks.openCheckout.mockResolvedValue(true);

    await expect(itemizeCommissionAt('charge-1', NOW)).resolves.toBe('retry_later');

    expect(mocks.openCheckout).toHaveBeenCalledWith('cus_aura');
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.recordError).toHaveBeenCalledWith('charge-1', PLAN_CHECKOUT_OPEN, NOW);
    expect(mocks.report).not.toHaveBeenCalled();
  });

  it('si no puede comprobar el Checkout, reintenta más tarde', async () => {
    mocks.openCheckout.mockRejectedValue(new Error('stripe down'));
    await expect(itemizeCommissionAt('charge-1', NOW)).resolves.toBe('retry_later');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('un concepto recuperado que ya está en una factura se pone al día', async () => {
    const item = { id: 'ii_1', invoice: 'in_9' };
    mocks.create.mockResolvedValue(item);

    await expect(itemizeCommissionAt('charge-1', NOW)).resolves.toBe('itemized');

    expect(mocks.reconcile).toHaveBeenCalledWith('prov-aura', item, NOW);
  });

  it('un concepto sin factura no se reconcilia', async () => {
    mocks.create.mockResolvedValue({ id: 'ii_1', invoice: null });
    await itemizeCommissionAt('charge-1', NOW);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
