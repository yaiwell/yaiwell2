/**
 * Tests de la tarjeta «Cobro en el local»: resumen (estado efectivo,
 * motivo de bloqueo, importes) y activación condicionada a método de
 * pago y a no tener deuda.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rows: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}));
vi.mock('./billing.commission.repository', () => ({
  commissionRepository: {
    findOnsiteSummaryRows: mocks.rows,
    enableOnsitePayment: mocks.enable,
    disableOnsitePayment: mocks.disable,
  },
}));

import { BillingProviderNotFoundError } from './billing.errors';
import { getOnsiteBillingSummary, setOnsitePaymentAcceptance } from './billing.onsite';
import {
  OnsiteCommissionDebtError,
  OnsitePaymentMethodMissingError,
} from './billing.onsite.errors';

const READY = new Date('2026-10-20T10:00:00Z');

function rows(billing: Record<string, unknown> | null, accepts = true, totals: unknown[] = []) {
  return { provider: { acceptsOnsitePayment: accepts, billing }, totals };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enable.mockResolvedValue(true);
  mocks.disable.mockResolvedValue(true);
});

describe('getOnsiteBillingSummary', () => {
  it('activado con método y sin deuda: se ofrece; suma importes por estado', async () => {
    mocks.rows.mockResolvedValue(
      rows({ onsitePaymentMethodReadyAt: READY, commissionDebtSince: null }, true, [
        { status: 'pending', _sum: { amountCents: 100 } },
        { status: 'invoiced', _sum: { amountCents: 250 } },
        { status: 'failed', _sum: { amountCents: 70 } },
      ]),
    );
    await expect(getOnsiteBillingSummary('prov-aura')).resolves.toEqual({
      enabled: true,
      effective: true,
      paymentMethodReady: true,
      paymentMethodReadyAt: READY,
      commissionDebtSince: null,
      enableBlockedBy: null,
      outstandingCommissionCents: 350,
      overdueCommissionCents: 70,
    });
  });

  it('con deuda deja de ofrecerse aunque el interruptor siga activado', async () => {
    const debt = new Date('2026-11-02T08:00:00Z');
    mocks.rows.mockResolvedValue(
      rows({ onsitePaymentMethodReadyAt: READY, commissionDebtSince: debt }),
    );
    const summary = await getOnsiteBillingSummary('prov-aura');
    expect(summary.enabled).toBe(true);
    expect(summary.effective).toBe(false);
    expect(summary.enableBlockedBy).toBe('commission_debt');
  });

  it('sin fila de facturación: falta el método de pago', async () => {
    mocks.rows.mockResolvedValue(rows(null, false));
    const summary = await getOnsiteBillingSummary('prov-aura');
    expect(summary.enableBlockedBy).toBe('payment_method_missing');
    expect(summary.paymentMethodReady).toBe(false);
  });

  it('negocio inexistente', async () => {
    mocks.rows.mockResolvedValue({ provider: null, totals: [] });
    await expect(getOnsiteBillingSummary('x')).rejects.toBeInstanceOf(BillingProviderNotFoundError);
  });
});

describe('setOnsitePaymentAcceptance', () => {
  it('desactivar siempre se puede', async () => {
    await setOnsitePaymentAcceptance('prov-aura', false);
    expect(mocks.disable).toHaveBeenCalledWith('prov-aura');
    expect(mocks.enable).not.toHaveBeenCalled();
  });

  it('activa si el UPDATE condicional pasa', async () => {
    await setOnsitePaymentAcceptance('prov-aura', true);
    expect(mocks.enable).toHaveBeenCalledWith('prov-aura');
  });

  it('sin método de pago: OnsitePaymentMethodMissingError', async () => {
    mocks.enable.mockResolvedValue(false);
    mocks.rows.mockResolvedValue(
      rows({ onsitePaymentMethodReadyAt: null, commissionDebtSince: null }),
    );
    await expect(setOnsitePaymentAcceptance('prov-aura', true)).rejects.toBeInstanceOf(
      OnsitePaymentMethodMissingError,
    );
  });

  it('con deuda: OnsiteCommissionDebtError (aunque tenga método)', async () => {
    mocks.enable.mockResolvedValue(false);
    mocks.rows.mockResolvedValue(
      rows({ onsitePaymentMethodReadyAt: READY, commissionDebtSince: new Date() }),
    );
    await expect(setOnsitePaymentAcceptance('prov-aura', true)).rejects.toBeInstanceOf(
      OnsiteCommissionDebtError,
    );
  });
});
