/**
 * Tests de `reconcileItemInvoice`: el estado actual de la factura del
 * concepto recuperado se traduce a la misma transición que el webhook.
 */
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), apply: vi.fn(), report: vi.fn() }));
vi.mock('@/lib/integrations/stripe', () => ({
  getStripeClient: () => ({ invoices: { retrieve: mocks.retrieve } }),
}));
vi.mock('./billing.commission.webhook', () => ({ applyCommissionInvoiceEvent: mocks.apply }));
vi.mock('./billing.report', () => ({ reportBillingIssue: mocks.report }));

import { reconcileItemInvoice } from './billing.commission.reconcile';

const NOW = new Date('2026-11-05T10:00:00Z');
const item = (invoice: unknown) => ({ id: 'ii_1', invoice }) as unknown as Stripe.InvoiceItem;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reconcileItemInvoice', () => {
  it.each([
    [{ status: 'open', attempted: false }, 'invoice.finalized'],
    [{ status: 'open', attempted: true }, 'invoice.payment_failed'],
    [{ status: 'paid', attempted: true }, 'invoice.paid'],
    [{ status: 'uncollectible', attempted: true }, 'invoice.marked_uncollectible'],
    [{ status: 'void', attempted: false }, 'invoice.voided'],
  ])('factura %j → %s', async (state, type) => {
    const invoice = { id: 'in_9', ...state };
    mocks.retrieve.mockResolvedValue(invoice);

    await reconcileItemInvoice('prov-aura', item('in_9'), NOW);

    expect(mocks.retrieve).toHaveBeenCalledWith('in_9', {}, expect.anything());
    expect(mocks.apply).toHaveBeenCalledWith(type, invoice, NOW);
  });

  it('un borrador no mueve nada', async () => {
    mocks.retrieve.mockResolvedValue({ id: 'in_9', status: 'draft' });
    await reconcileItemInvoice('prov-aura', item('in_9'), NOW);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('usa la factura expandida sin pedirla otra vez', async () => {
    await reconcileItemInvoice('prov-aura', item({ id: 'in_9', status: 'paid' }), NOW);
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.apply).toHaveBeenCalledWith('invoice.paid', expect.anything(), NOW);
  });

  it('nunca lanza', async () => {
    mocks.retrieve.mockRejectedValue(new Error('down'));
    await expect(reconcileItemInvoice('prov-aura', item('in_9'), NOW)).resolves.toBeUndefined();
    expect(mocks.report).toHaveBeenCalled();
  });
});
